const fs = require('fs');
const path = require('path');
const pino = require('pino');
const NodeCache = require('node-cache');
const chalk = require('chalk');
const moment = require('moment-timezone');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    fetchLatestBaileysVersion,
    generateMessageID,
    delay
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { MessagesUpsert, Solving } = require('../core/message');
const botCtx = require('../core/context');
const { beautifyLegacyCaption } = require('../utils/formatter');

const SESSION_ROOT = path.join(process.cwd(), 'jadibot-session');
const PAIRING_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_JADIBOT = 5;
const MAX_RECONNECT = 10;

const MAIN_SETUP_COMMANDS = new Set([
    'ceksetup', 'infobot', 'setuplist', 'cekconfig',
    'setbotname', 'setnamabot', 'renamebot',
    'setowner', 'setnoowner', 'setnomorowner',
    'setnamaowner', 'setownername', 'renameowner',
    'setpackname', 'setpack', 'setwm',
    'setascii', 'setasciiname', 'setbanner',
    'setthumb', 'setthumbnail', 'setimgmenu', 'setimgbot',
    'setimage', 'setglobalimage', 'setimg',
    'setpay', 'setpayment', 'setglobalpay', 'setqris',
    'setaudiomenu', 'setaudio', 'audiomenu',
    'resetsetup', 'resetbotconfig'
]);

const SENSITIVE_COMMANDS = new Set([
    'getsc', 'backup', 'autobackup', 'setbackup', 'setautobackup',
    'addcase', 'getcase', 'delcase', 'listcase',
    'addplugin', 'addfitur', 'getplugin', 'getfitur', 'delplugin', 'delfitur', 'listplugin', 'listfitur',
    'togglefitur', 'offfitur', 'onfitur', 'disablefitur', 'enablefitur', 'listoff',
    'reloadplugin', 'reloadfitur', 'reloadplugins',
    'cekapi', 'healthcheck', 'testapi',
    'setrestart', 'restart', 'dbstatus', 'cekdb', 'infodb', 'savedb', 'syncdb', 'settimezone', 'timezone',
    'jadibot', 'setjadibot', 'listjadibot', 'listjbot', 'deljadibot', 'deljbot',
    'stopjadibot', 'stopjbot', 'restartjadibot', 'restartjbot',
    'clonerstats', 'monitorcloner', 'cekclonerall',
    'callsetup', 'buildcaller', 'callpair', 'paircall', 'calllogout',
    'ytdlpsetup', 'updateytdlp', 'installytdlp', 'setytcookies', 'ytcookies', 'cookiesyt',
    'setptero', 'setpterov1', 'setpterov2', 'setpterov3', 'statusptero', 'cekptero',
    'sendemail', 'sendmail', 'kirimemail',
    'addreseller', 'addresellerv1', 'addresellerv2', 'addresellerv3',
    'delreseller', 'delresellerv1', 'delresellerv2', 'delresellerv3',
    'listreseller', 'listresellerv1', 'listresellerv2', 'listresellerv3',
    '1gb', '1gbv1', '1gbv2', '1gbv3', '2gb', '2gbv1', '2gbv2', '2gbv3',
    '3gb', '3gbv1', '3gbv2', '3gbv3', '4gb', '4gbv1', '4gbv2', '4gbv3',
    '5gb', '5gbv1', '5gbv2', '5gbv3', '6gb', '6gbv1', '6gbv2', '6gbv3',
    '7gb', '7gbv1', '7gbv2', '7gbv3', '8gb', '8gbv1', '8gbv2', '8gbv3',
    '9gb', '9gbv1', '9gbv2', '9gbv3', '10gb', '10gbv1', '10gbv2', '10gbv3',
    'unli', 'unliv1', 'unliv2', 'unliv3',
    'listserver', 'listserverv1', 'listserverv2', 'listserverv3',
    'delserver', 'delserverv1', 'delserverv2', 'delserverv3',
    'sinfo', 'sinfov1', 'sinfov2', 'sinfov3', 'serverinfo', 'serverinfov1', 'serverinfov2', 'serverinfov3',
    'suspend', 'suspendv1', 'suspendv2', 'suspendv3',
    'unsuspend', 'unsuspendv1', 'unsuspendv2', 'unsuspendv3',
    'listuser', 'listuserv1', 'listuserv2', 'listuserv3',
    'deluser', 'deluserv1', 'deluserv2', 'deluserv3',
    'addptam', 'delptam', 'listptam', 'ptamlist',
    ...MAIN_SETUP_COMMANDS
]);

const CLONER_BROADCAST_COMMANDS = new Set([
    'jpm', 'jpmtag', 'jpmpilih', 'autojpm', 'autojpmtag', 'pushkontak', 'swgc', 'autoswgc'
]);

const DEFAULT_CLONER_JPM_COOLDOWN_MS = 10 * 60 * 1000;
const clonerBroadcastTimestamps = new Map();

const instances = new Map();
const pendingPrompts = new Map();
const processedMsgIds = new Map();

function claimCommandExecution(msgId) {
    if (!msgId) return true;
    const now = Date.now();
    for (const [k, ts] of processedMsgIds.entries()) {
        if (now - ts > 60000) processedMsgIds.delete(k);
    }
    if (processedMsgIds.has(msgId)) return false;
    processedMsgIds.set(msgId, now);
    return true;
}

function setPendingJadibotPrompt(chatId, senderNumber, data) {
    const cleanSender = normalizeNumber(senderNumber);
    const key = `${chatId}_${cleanSender}`;
    pendingPrompts.set(key, {
        ...data,
        chatId,
        senderNumber: cleanSender,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
    });
}

function getPendingJadibotPrompt(chatId, senderNumber) {
    const cleanSender = normalizeNumber(senderNumber);
    const key = `${chatId}_${cleanSender}`;
    const item = pendingPrompts.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        pendingPrompts.delete(key);
        return null;
    }
    return item;
}

function clearPendingJadibotPrompt(chatId, senderNumber) {
    const cleanSender = normalizeNumber(senderNumber);
    const key = `${chatId}_${cleanSender}`;
    pendingPrompts.delete(key);
}

function loadRegistry() {
    try {
        return botCtx.getJadibotRegistry();
    } catch (e) {
        console.error('[Jadibot] registry load error:', e.message);
        return {};
    }
}

function saveRegistry(reg) {
    try {
        botCtx.saveJadibotRegistry(reg);
    } catch (e) {
        console.error('[Jadibot] registry save error:', e.message);
    }
}

function sessionDir(number) {
    return path.join(SESSION_ROOT, number);
}

function normalizeNumber(raw) {
    return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function isValidNumber(num) {
    return /^62\d{8,13}$/.test(num);
}

function getJadibotConfig(number) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    const entry = reg[number];
    if (!entry) return null;
    const id = botCtx.getJadibotIdentity(number);
    return {
        botname: id.botname,
        namaOwner: id.namaOwner,
        owner: id.owner,
        packname: id.packname,
        asciiName: id.asciiName,
        asciiFont: id.asciiFont,
        audiomenu: id.audiomenu,
        image: id.image,
        payment: id.payment
    };
}

function refreshLiveInstanceConfig(number) {
    number = normalizeNumber(number);
    const inst = instances.get(number);
    const cfg = getJadibotConfig(number);
    if (inst && cfg) {
        inst.jadibotConfig = cfg;
        if (inst.socket) {
            inst.socket.jadibotConfig = cfg;
        }
    }
}

function resolveTargetJadibot(Dinz, senderNumber, explicitNum) {
    const cleanExplicit = normalizeNumber(explicitNum);
    const reg = loadRegistry();

    if (cleanExplicit && isValidNumber(cleanExplicit) && (reg[cleanExplicit] || instances.has(cleanExplicit))) {
        return cleanExplicit;
    }

    if (Dinz && Dinz.isJadibot && Dinz.jadibotNumber) {
        return normalizeNumber(Dinz.jadibotNumber);
    }

    const cleanSender = normalizeNumber(senderNumber);
    const mappedSender = (global.lidMap && global.lidMap[cleanSender]) ? normalizeNumber(global.lidMap[cleanSender]) : cleanSender;
    const candidates = [...new Set([cleanSender, mappedSender].filter(Boolean))];

    for (const c of candidates) {
        if (reg[c] || instances.has(c)) return c;
    }

    const allNumbers = [...new Set([...Object.keys(reg), ...instances.keys()])];
    const ownedBySender = allNumbers.filter(num => {
        const entry = reg[num] || {};
        const cfg = entry.config || {};
        const req = normalizeNumber(entry.requester);
        const own = normalizeNumber(cfg.owner);
        const extraOwners = Array.isArray(cfg.owners) ? cfg.owners.map(normalizeNumber) : [];
        return candidates.some(c => c === req || c === own || extraOwners.includes(c));
    });

    if (ownedBySender.length > 0) {
        const runningOwned = ownedBySender.find(n => instances.get(n)?.status === 'running' || reg[n]?.status === 'running');
        return runningOwned || ownedBySender[0];
    }

    if (allNumbers.length === 1) {
        return allNumbers[0];
    }

    return null;
}

function autoConfigureClone(targetNumber, newBotName, opts = {}) {
    targetNumber = normalizeNumber(targetNumber);
    if (!targetNumber) {
        return { ok: false, message: 'Nomor jadibot tidak ditemukan.' };
    }
    const cleanName = String(newBotName || '').trim();
    if (!cleanName) {
        return { ok: false, message: 'Nama bot tidak boleh kosong.' };
    }

    const reg = loadRegistry();
    if (!reg[targetNumber] && !instances.has(targetNumber)) {
        return { ok: false, message: `Tidak ada jadibot dengan nomor ${targetNumber}` };
    }

    reg[targetNumber] = reg[targetNumber] || {
        status: instances.get(targetNumber)?.status || 'stopped',
        config: {},
        requester: normalizeNumber(opts.requester) || targetNumber,
        createdAt: Date.now()
    };

    const existingCfg = reg[targetNumber].config || {};
    const requesterNum = normalizeNumber(reg[targetNumber].requester) || normalizeNumber(opts.requester) || targetNumber;
    const ownerNum = (existingCfg.owner && existingCfg.owner !== '6285187652117')
        ? normalizeNumber(existingCfg.owner)
        : requesterNum;

    const existingNamaOwner = existingCfg.namaOwner ? String(existingCfg.namaOwner).trim() : '';
    const namaOwner = (existingNamaOwner && !['shiki', 'shiki ai', 'rizki'].includes(existingNamaOwner.toLowerCase()))
        ? existingNamaOwner
        : (opts.pushName ? String(opts.pushName).trim() : cleanName);

    const defaultQris = global._mainConfig?.payment?.qris || global._mainConfig?.image?.qris || "https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg";
    const defaultMenuImg = global._mainConfig?.image?.menu || "https://k.top4top.io/p_3960958ul1.jpg";

    const currentPayment = existingCfg.payment || {};
    const payment = {
        qris: currentPayment.qris || defaultQris,
        dana: (currentPayment.dana && currentPayment.dana !== '6285187652117') ? currentPayment.dana : ownerNum,
        gopay: (currentPayment.gopay && currentPayment.gopay !== '6285187652117') ? currentPayment.gopay : ownerNum,
        an: (currentPayment.an && !['shiki', 'rizki', 'shiki ai'].includes(String(currentPayment.an).toLowerCase())) ? currentPayment.an : cleanName
    };

    const currentImage = existingCfg.image || {};
    const image = {
        menu: currentImage.menu || defaultMenuImg,
        qris: currentImage.qris || payment.qris
    };

    const ownersList = Array.isArray(existingCfg.owners) ? [...existingCfg.owners] : [];
    for (const num of [targetNumber, ownerNum, requesterNum]) {
        if (num && !ownersList.includes(num)) ownersList.push(num);
    }

    reg[targetNumber].config = {
        ...existingCfg,
        botname: cleanName,
        packname: cleanName,
        namaOwner: namaOwner || cleanName,
        owner: ownerNum,
        owners: ownersList,
        payment,
        image
    };

    saveRegistry(reg);

    botCtx.ensureJadibotData(targetNumber, ownerNum);
    try {
        const existingOwners = botCtx.getSection('owner', targetNumber);
        const mergedOwners = [...new Set([...(Array.isArray(existingOwners) ? existingOwners : []), ...ownersList])];
        botCtx.setSection('owner', mergedOwners, targetNumber);
    } catch (e) {}

    botCtx.getJadibotMemoryDb(targetNumber);
    refreshLiveInstanceConfig(targetNumber);

    const updatedIdentity = botCtx.getJadibotIdentity(targetNumber);
    return {
        ok: true,
        number: targetNumber,
        identity: updatedIdentity,
        message:
            `✅ *Konfigurasi Clone Jadibot Berhasil!*\n\n` +
            `> ◦ Nomor Bot : *${targetNumber}*\n` +
            `> ◦ Nama Bot : *${updatedIdentity.botname}*\n` +
            `> ◦ Packname : *${updatedIdentity.packname}*\n` +
            `> ◦ Owner Bot : *${updatedIdentity.owner}* (${updatedIdentity.namaOwner})\n` +
            `> ◦ Database : *Terpisah & Terisolasi*\n\n` +
            `_Semua identitas dan fitur pada bot clone ini telah otomatis disinkronkan._`
    };
}

function setJadibotConfig(number, key, value) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    if (!reg[number]) return { ok: false, message: 'Tidak ada jadibot dengan nomor itu' };
    const allowed = ['botname', 'namaOwner', 'owner', 'packname'];
    if (key === 'reset') {
        const defaultName = `Bot ${number}`;
        return autoConfigureClone(number, defaultName, { requester: reg[number].requester });
    }
    if (!allowed.includes(key)) {
        return { ok: false, message: `Key tidak dikenal. Allowed: ${allowed.join(', ')}, reset` };
    }
    if (key === 'botname') {
        return autoConfigureClone(number, value, { requester: reg[number].requester });
    }
    if (key === 'owner') {
        const ownerNum = normalizeNumber(value);
        if (!isValidNumber(ownerNum)) return { ok: false, message: 'Format owner harus 62xxxxxxxxxx' };
        value = ownerNum;
    }
    reg[number].config = reg[number].config || {};
    reg[number].config[key] = value;
    saveRegistry(reg);
    refreshLiveInstanceConfig(number);
    return { ok: true, message: `${key} = ${value}` };
}

function getJadibotDb(number, key, fallback = null) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    const val = reg[number]?.config?.[key];
    return val === undefined ? fallback : val;
}

function setJadibotDb(number, key, value) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    if (!reg[number]) {
        reg[number] = { status: 'stopped', config: {}, requester: number, createdAt: Date.now() };
    }
    reg[number].config = reg[number].config || {};
    reg[number].config[key] = value;
    saveRegistry(reg);
    refreshLiveInstanceConfig(number);
    return true;
}

function getJadibotPayment(number) {
    number = normalizeNumber(number);
    return botCtx.getJadibotIdentity(number).payment;
}

function setJadibotPayment(number, payment) {
    return setJadibotDb(number, 'payment', payment);
}

function getJadibotImage(number) {
    number = normalizeNumber(number);
    return botCtx.getJadibotIdentity(number).image;
}

function setJadibotImage(number, image) {
    return setJadibotDb(number, 'image', image);
}

function getJadibotOwners(number) {
    number = normalizeNumber(number);
    const list = getJadibotDb(number, 'owners', []);
    const arr = Array.isArray(list) ? list.map(normalizeNumber) : [];
    let storeOwners = [];
    try {
        botCtx.ensureJadibotData(number);
        const raw = botCtx.getSection('owner', number);
        if (Array.isArray(raw)) storeOwners = raw.map(normalizeNumber);
    } catch (e) {}
    return [...new Set([...arr, ...storeOwners].filter(Boolean))];
}

function addJadibotOwner(number, ownerNum) {
    number = normalizeNumber(number);
    ownerNum = normalizeNumber(ownerNum);
    if (!isValidNumber(ownerNum)) return { ok: false, message: 'Format nomor tidak valid' };
    const owners = getJadibotOwners(number);
    if (owners.includes(ownerNum)) return { ok: false, message: `Nomor ${ownerNum} sudah terdaftar` };
    owners.push(ownerNum);
    setJadibotDb(number, 'owners', owners);
    try {
        botCtx.setSection('owner', owners, number);
    } catch (e) {}
    return { ok: true, message: `${ownerNum} ditambahkan sebagai owner jadibot` };
}

function delJadibotOwner(number, ownerNum) {
    number = normalizeNumber(number);
    ownerNum = normalizeNumber(ownerNum);
    const owners = getJadibotOwners(number);
    if (!owners.includes(ownerNum)) return { ok: false, message: `Nomor ${ownerNum} tidak ditemukan` };
    const updated = owners.filter(v => v !== ownerNum);
    setJadibotDb(number, 'owners', updated);
    try {
        botCtx.setSection('owner', updated, number);
    } catch (e) {}
    return { ok: true, message: `${ownerNum} dihapus dari owner jadibot` };
}

async function notifyChat(sock, chatId, text) {
    if (!sock || !chatId) return;
    try {
        await sock.sendMessage(chatId, { text });
    } catch (e) {
        console.error('[Jadibot] notifyChat error:', e.message);
    }
}

function clearPairingTimer(number) {
    const inst = instances.get(number);
    if (inst && inst.pairingTimer) {
        clearTimeout(inst.pairingTimer);
        inst.pairingTimer = null;
    }
}

async function cleanupFailedPairing(number) {
    clearPairingTimer(number);
    const inst = instances.get(number);
    if (inst && inst.socket) {
        try { inst.socket.end(undefined); } catch (e) {}
        try { inst.socket.ev.removeAllListeners(); } catch (e) {}
    }
    instances.delete(number);
    try { fs.rmSync(sessionDir(number), { recursive: true, force: true }); } catch (e) {}
    const reg = loadRegistry();
    if (reg[number] && reg[number].status === 'pairing') {
        delete reg[number];
        saveRegistry(reg);
    }
}

async function startJadibot(number, opts = {}) {
    number = normalizeNumber(number);
    if (!isValidNumber(number)) {
        return { ok: false, message: 'Format nomor tidak valid. Gunakan 62xxxxxxxxxx' };
    }

    const mainOwner = normalizeNumber(botCtx.getMainOwner());
    if (number === mainOwner) {
        return { ok: false, message: 'Tidak bisa clone nomor owner utama' };
    }

    const existing = instances.get(number);
    const reg = loadRegistry();
    const inputDays = opts.days ? parseInt(String(opts.days).replace(/[^0-9]/g, ''), 10) : 0;

    if (existing && (existing.status === 'running' || existing.status === 'pairing' || existing.starting)) {
        if (existing.status === 'running' && opts.pairing && inputDays > 0 && reg[number]) {
            const baseTime = (reg[number].expiredAt && reg[number].expiredAt > Date.now()) ? reg[number].expiredAt : Date.now();
            reg[number].days = (reg[number].days || 0) + inputDays;
            reg[number].expiredAt = baseTime + (inputDays * 24 * 60 * 60 * 1000);
            saveRegistry(reg);
            const expStr = moment(reg[number].expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm [WIB]');
            const msg = `✅ *Masa Aktif Jadibot Diperpanjang!*\n> ◦ Nomor : *${number}*\n> ◦ Tambahan : *+${inputDays} Hari*\n> ◦ Sisa Waktu : *${formatRemainingTime(reg[number].expiredAt)}*\n> ◦ Berakhir : *${expStr}*`;
            if (opts.onNotify) await opts.onNotify(msg);
            return { ok: true, extended: true, message: msg };
        }
        return { ok: false, message: `Nomor ${number} sudah ${existing.status}` };
    }

    const limits = getJadibotLimits();
    const runningCount = [...instances.values()].filter(i => i.status === 'running' || i.status === 'pairing').length;
    if (!reg[number] && limits.maxCloner > 0 && runningCount >= limits.maxCloner) {
        return { ok: false, message: `Limit cloner aktif tercapai (${runningCount}/${limits.maxCloner}). Hapus salah satu atau naikkan batas lewat *setjadibot max <angka>*.` };
    }

    const dir = sessionDir(number);
    if (opts.pairing && fs.existsSync(dir)) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }

    const requesterNum = normalizeNumber(opts.requester) || normalizeNumber(reg[number]?.requester) || number;
    const activeDays = inputDays > 0 ? inputDays : (reg[number]?.days || 30);
    const expiredAt = inputDays > 0
        ? (Date.now() + inputDays * 24 * 60 * 60 * 1000)
        : (reg[number]?.expiredAt || (Date.now() + activeDays * 24 * 60 * 60 * 1000));

    if (!reg[number]) {
        const initialBotname = opts.botname || `Bot ${number}`;
        reg[number] = {
            status: 'starting',
            requester: requesterNum,
            createdAt: Date.now(),
            days: activeDays,
            expiredAt,
            config: {
                botname: initialBotname,
                packname: initialBotname,
                namaOwner: initialBotname,
                owner: requesterNum,
                owners: [...new Set([number, requesterNum].filter(Boolean))]
            }
        };
        saveRegistry(reg);
    } else {
        if (inputDays > 0 || !reg[number].expiredAt) {
            reg[number].days = activeDays;
            reg[number].expiredAt = expiredAt;
        }
        if (reg[number].config) {
            const c = reg[number].config;
            if (!c.botname || String(c.botname).toLowerCase() === 'shiki ai') {
                c.botname = `Bot ${number}`;
            }
            if (!c.packname || ['shiki', 'shiki ai'].includes(String(c.packname).toLowerCase())) {
                c.packname = c.botname;
            }
            if (!c.namaOwner || ['shiki', 'shiki ai', 'rizki'].includes(String(c.namaOwner).toLowerCase())) {
                c.namaOwner = c.botname;
            }
            if (!c.owner || c.owner === '6285187652117') {
                c.owner = requesterNum || number;
            }
        }
        saveRegistry(reg);
    }

    botCtx.ensureJadibotDb(number, reg[number]?.config?.owner || requesterNum);
    botCtx.getJadibotMemoryDb(number);

    const isInitialPairing = !!(opts.pairing || opts.firstConnectPending);

    const inst = {
        socket: null,
        status: 'starting',
        pairingCode: null,
        chatToNotify: isInitialPairing ? (opts.chatId || null) : null,
        onNotify: isInitialPairing ? (opts.onNotify || null) : null,
        firstConnectPending: isInitialPairing,
        reconnectAttempts: 0,
        starting: true,
        pairingTimer: null,
        connectedNotified: !isInitialPairing,
        jadibotConfig: getJadibotConfig(number),
        number
    };
    instances.set(number, inst);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(dir);
        const isRegistered = !!state.creds?.registered;
        const { version } = await fetchLatestBaileysVersion();

        const store = await makeInMemoryStore({
            logger: pino().child({ level: 'silent', stream: 'store' })
        });

        const groupCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
        const staleGroupCache = new Map();
        const sentMessageCache = new NodeCache({ stdTTL: 1800, checkperiod: 180, maxKeys: 1000, useClones: false });
        const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
        const userDevicesCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

        const Dinz = makeWASocket({
            version,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ['Ubuntu', 'Chrome', '22.04.2'],
            generateHighQualityLinkPreview: false,
            msgRetryCounterCache,
            userDevicesCache,
            getMessage: async (key) => {
                try {
                    if (!key || !key.id) return undefined;
                    const cached = sentMessageCache.get(key.id);
                    if (cached) return cached;
                    const loaded = await store.loadMessage(key.remoteJid, key.id);
                    if (loaded?.message) return loaded.message;
                } catch (_) {}
                return undefined;
            },
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 25000,
            defaultQueryTimeoutMs: 60000,
        });

        Dinz.isJadibot = true;
        Dinz.jadibotNumber = number;
        Dinz.jadibotConfig = inst.jadibotConfig;

        Dinz.safeGroupMetadata = async (id) => {
            if (groupCache.has(id)) return groupCache.get(id);
            try {
                const meta = await Dinz.groupMetadata(id);
                groupCache.set(id, meta);
                staleGroupCache.set(id, meta);
                if (staleGroupCache.size > 500) {
                    const oldest = staleGroupCache.keys().next().value;
                    staleGroupCache.delete(oldest);
                }
                return meta;
            } catch (err) {
                if (staleGroupCache.has(id)) return staleGroupCache.get(id);
                return { id, subject: 'Unknown', participants: [] };
            }
        };
        Dinz.ev.on('group-participants.update', (u) => { if (u?.id) groupCache.del(u.id); });
        Dinz.ev.on('groups.update', (updates) => {
            if (Array.isArray(updates)) updates.forEach((u) => { if (u?.id) groupCache.del(u.id); });
        });

        Dinz.ev.on('creds.update', saveCreds);

        let pairingRequested = false;
        const requestPairing = async () => {
            if (pairingRequested || isRegistered) return;
            pairingRequested = true;
            try {
                await delay(500);
                const code = await Dinz.requestPairingCode(number);
                inst.pairingCode = code;
                inst.status = 'pairing';
                const pretty = code.length === 8 ? code.slice(0, 4) + '-' + code.slice(4) : code;

                const text =
                    `🔗 *Pairing Code Jadibot*\n` +
                    `> ◦ Nomor : *${number}*\n` +
                    `> ◦ Masa Aktif : *${activeDays} Hari*\n` +
                    `> ◦ Kode : *${pretty}*\n\n` +
                    `Buka WhatsApp → *Perangkat Tertaut* → *Tautkan dengan nomor telepon* → masukkan kode di atas.\n` +
                    `⏳ Timeout: 3 menit`;

                if (inst.onNotify) inst.onNotify(text);
                else if (inst.chatToNotify) notifyChat(global.socket, inst.chatToNotify, text);

                clearPairingTimer(number);
                inst.pairingTimer = setTimeout(async () => {
                    const cur = instances.get(number);
                    if (cur && cur.status === 'pairing') {
                        const failText = `❌ *Pairing expired*\n> ◦ Nomor : *${number}*\n> ◦ Kode tidak dipakai dalam 3 menit.`;
                        if (cur.onNotify) cur.onNotify(failText);
                        else if (cur.chatToNotify) notifyChat(global.socket, cur.chatToNotify, failText);
                        await cleanupFailedPairing(number);
                    }
                }, PAIRING_TIMEOUT_MS);

                console.log(chalk.yellow(`[Jadibot] Pairing code for ${number}: ${pretty}`));
            } catch (e) {
                console.error('[Jadibot] requestPairingCode error:', e.message);
                const failText = `❌ Gagal membuat pairing code: ${e.message}`;
                if (inst.onNotify) inst.onNotify(failText);
                await cleanupFailedPairing(number);
            }
        };

        Dinz.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !isRegistered && !pairingRequested) {
                await requestPairing();
            }

            if (connection === 'open') {
                inst.status = 'running';
                inst.starting = false;
                inst.reconnectAttempts = 0;
                inst.pairingCode = null;
                clearPairingTimer(number);

                const r = loadRegistry();
                r[number] = r[number] || { config: {}, requester: requesterNum };
                r[number].status = 'running';
                r[number].stoppedByUser = false;
                r[number].startedAt = Date.now();
                r[number].config = r[number].config || {};
                saveRegistry(r);

                try {
                    const rawNews = global.autoFollowNewsletterId || '120363423239131660@newsletter';
                    const jids = String(rawNews).split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).map(s => s.endsWith('@newsletter') ? s : s + '@newsletter');
                    for (const jid of jids) {
                        await Dinz.newsletterFollow(jid).catch(() => {});
                    }
                } catch (_) {}

                if (inst.firstConnectPending && !inst.connectedNotified) {
                    inst.connectedNotified = true;
                    inst.firstConnectPending = false;
                    const id = botCtx.getJadibotIdentity(number);
                    const expDateStr = r[number]?.expiredAt
                        ? moment(r[number].expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm [WIB]')
                        : '-';
                    const okText =
                        `✅ *Jadibot terhubung!*\n` +
                        `> ◦ Nomor : *${number}*\n` +
                        `> ◦ Nama Bot : *${id.botname}*\n` +
                        `> ◦ Masa Aktif : *${r[number]?.days || activeDays} Hari (Exp: ${expDateStr})*\n` +
                        `> ◦ Status : *Running*\n\n` +
                        `💡 Ketik *setjadibot botname* untuk mengganti nama bot clone secara otomatis.`;
                    if (inst.onNotify) inst.onNotify(okText);
                    else if (inst.chatToNotify) notifyChat(global.socket, inst.chatToNotify, okText);
                }

                inst.onNotify = null;
                inst.chatToNotify = null;
                inst.firstConnectPending = false;

                console.log(chalk.green(`[Jadibot] ${number} CONNECTED ✓`));
            }

            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(chalk.yellow(`[Jadibot] ${number} disconnect reason:`), reason || 'Unknown');

                if (reason === DisconnectReason.loggedOut) {
                    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
                    const r = loadRegistry();
                    if (r[number]) { r[number].status = 'stopped'; saveRegistry(r); }
                    inst.status = 'stopped';
                    try { Dinz.ev.removeAllListeners(); } catch (e) {}
                    instances.delete(number);
                    return;
                }

                if (reason === DisconnectReason.connectionReplaced || reason === 440) {
                    const r = loadRegistry();
                    if (r[number]) { r[number].status = 'stopped'; saveRegistry(r); }
                    inst.status = 'stopped';
                    try { Dinz.end(undefined); } catch (e) {}
                    try { Dinz.ev.removeAllListeners(); } catch (e) {}
                    instances.delete(number);
                    return;
                }

                const wasInitialPairingRestart = (inst.status === 'pairing' || inst.firstConnectPending) &&
                    (reason === 515 || reason === DisconnectReason.restartRequired);

                if (inst.status === 'pairing' && !isRegistered && !wasInitialPairingRestart) {
                    return;
                }

                if (inst.status === 'stopped') return;
                if (inst.reconnectAttempts >= MAX_RECONNECT) {
                    const r = loadRegistry();
                    if (r[number]) { r[number].status = 'stopped'; saveRegistry(r); }
                    inst.status = 'stopped';
                    try { Dinz.ev.removeAllListeners(); } catch (e) {}
                    instances.delete(number);
                    return;
                }

                inst.reconnectAttempts++;
                const wait = wasInitialPairingRestart ? 1500 : Math.min(5000 * Math.pow(1.5, inst.reconnectAttempts), 60000);
                console.log(chalk.yellow(`[Jadibot] ${number} reconnect ${inst.reconnectAttempts}/${MAX_RECONNECT} in ${Math.round(wait/1000)}s`));
                setTimeout(async () => {
                    try {
                        try { Dinz.ev.removeAllListeners(); } catch (e) {}
                        instances.delete(number);
                        const r = loadRegistry();
                        const wasRunning = r[number] && r[number].status !== 'stopped';
                        if (wasRunning || inst.status === 'running' || inst.status === 'pairing') {
                            await startJadibot(number, {
                                resume: true,
                                firstConnectPending: wasInitialPairingRestart ? inst.firstConnectPending : false,
                                chatId: wasInitialPairingRestart ? inst.chatToNotify : null,
                                onNotify: wasInitialPairingRestart ? inst.onNotify : null,
                                requester: r[number]?.requester
                            });
                        }
                    } catch (e) {
                        console.error('[Jadibot] reconnect error:', e.message);
                    }
                }, wait);
            }
        });

        await store.bind(Dinz.ev);
        await botCtx.runWithBotContext(Dinz, async () => {
            await Solving(Dinz, store);
        });

        Dinz.ev.on('messages.upsert', async (message) => {
            try {
                await botCtx.runWithBotContext(Dinz, async () => {
                    await MessagesUpsert(Dinz, message, store);
                });
            } catch (err) {
                console.error(`[Jadibot ${number}] messages error:`, err.message);
            }
        });

        try {
            require('../services/presence').attachPresenceListener(Dinz);
        } catch (_) {}

        Dinz.ev.on('group-participants.update', async (update) => {
            try {
                await botCtx.runWithBotContext(Dinz, async () => {
                    const { id, participants, action } = update;
                    const groupData = global.db?.groups?.[id];
                    if (!groupData) return;

                    await delay(1500);
                    const metadata = await Dinz.groupMetadata(id).catch(() => null);
                    if (!metadata || !metadata.subject) return;

                    const groupName = metadata.subject;
                    const totalMember = metadata.participants?.length || 0;

                    const convertJid = (jid) => {
                        if (jid.endsWith('@lid')) {
                            const participant = metadata?.participants?.find(p => p.lid === jid || p.id === jid);
                            return participant && participant.jid ? participant.jid : jid;
                        }
                        return jid;
                    };

                    if (groupData.welcome && action === 'add') {
                        const welcomeDB = botCtx.getSection('welcome', Dinz) || {};
                        for (let n of participants) {
                            try {
                                const finalJid = convertJid(n);
                                const teksWelcome = welcomeDB[id]?.welcomeText || `Halo @user, selamat datang di @group, Kamu Member ke *@totalmember*`;
                                const datenow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                                const teks = teksWelcome
                                    .replace(/@user/g, `@${finalJid.split('@')[0]}`)
                                    .replace(/@group/g, groupName)
                                    .replace(/@totalmember/g, totalMember)
                                    .replace(/@datenow/g, datenow);
                                const customWelcomeImageUrl = welcomeDB[id]?.welcomeImage;
                                const imageUrl = customWelcomeImageUrl || global.image?.menu;

                                if (imageUrl) {
                                    await Dinz.sendMessage(id, {
                                        image: { url: imageUrl },
                                        caption: teks,
                                        contextInfo: { mentionedJid: [finalJid] }
                                    });
                                } else {
                                    await Dinz.sendMessage(id, {
                                        text: teks,
                                        contextInfo: { mentionedJid: [finalJid] }
                                    });
                                }
                            } catch (e) {}
                        }
                    } else if (groupData.left && action === 'remove') {
                        const leftDB = botCtx.getSection('left', Dinz) || {};
                        for (let n of participants) {
                            try {
                                const finalJid = convertJid(n);
                                const teksLeft = leftDB[id]?.leftText || `@user telah keluar dari @group`;
                                const datenow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                                const teks = teksLeft
                                    .replace(/@user/g, `@${finalJid.split('@')[0]}`)
                                    .replace(/@group/g, groupName)
                                    .replace(/@totalmember/g, totalMember)
                                    .replace(/@datenow/g, datenow);
                                const customLeftImageUrl = leftDB[id]?.leftImage;
                                const imageUrl = customLeftImageUrl || global.image?.menu;

                                if (imageUrl) {
                                    await Dinz.sendMessage(id, {
                                        image: { url: imageUrl },
                                        caption: teks,
                                        contextInfo: { mentionedJid: [finalJid] }
                                    });
                                } else {
                                    await Dinz.sendMessage(id, {
                                        text: teks,
                                        contextInfo: { mentionedJid: [finalJid] }
                                    });
                                }
                            } catch (e) {}
                        }
                    }
                });
            } catch (err) {
                console.log(chalk.yellow(`[Jadibot ${number}] Group participants update error:`), err.message);
            }
        });

        const userQueues = {};
        const messageTimestamps = new Map();
        const oriSend = Dinz.sendMessage.bind(Dinz);

        if (typeof Dinz.relayMessage === 'function') {
            const oriRelay = Dinz.relayMessage.bind(Dinz);
            Dinz.relayMessage = async (jid, message, opts = {}) => {
                const msgId = opts?.messageId || (typeof generateMessageID === 'function' ? generateMessageID() : undefined);
                if (msgId && message) {
                    sentMessageCache.set(msgId, message);
                    global.sentKeys = global.sentKeys || new Set();
                    global.sentKeys.add(msgId);
                }
                return oriRelay(jid, message, { ...opts, ...(msgId ? { messageId: msgId } : {}), AI: opts?.AI === true });
            };
        }

        Dinz.sendMessage = async (jid, content, options) => {
            let safeContent = content;
            if (content && typeof content === 'object') {
                safeContent = { ...content };
                const topMentions = Array.isArray(safeContent.mentions) ? safeContent.mentions : [];
                const existingCtx = (safeContent.contextInfo && typeof safeContent.contextInfo === 'object') ? { ...safeContent.contextInfo } : null;
                const prevMentions = existingCtx && Array.isArray(existingCtx.mentionedJid) ? existingCtx.mentionedJid : [];
                if (topMentions.length > 0 || prevMentions.length > 0) {
                    const seenExact = new Set();
                    const seenCanonical = new Set();
                    const mergedMentions = [];
                    for (const item of [...prevMentions, ...topMentions]) {
                        if (!item || typeof item !== 'string') continue;
                        const cleanJid = item.trim().replace(/:\d+@/, '@');
                        if (!cleanJid || seenExact.has(cleanJid)) continue;
                        const digits = cleanJid.split('@')[0].replace(/[^0-9]/g, '');
                        const canonical = (digits && global.lidMap && global.lidMap[digits]) ? global.lidMap[digits] : (digits || cleanJid);
                        if (seenCanonical.has(canonical)) continue;
                        seenExact.add(cleanJid);
                        seenCanonical.add(canonical);
                        mergedMentions.push(cleanJid);
                    }
                    safeContent.contextInfo = {
                        ...(existingCtx || {}),
                        mentionedJid: mergedMentions
                    };
                }
                if ('mentions' in safeContent) delete safeContent.mentions;
                if ('jpegThumbnail' in safeContent && (!Buffer.isBuffer(safeContent.jpegThumbnail) || safeContent.jpegThumbnail.length === 0)) {
                    delete safeContent.jpegThumbnail;
                }
                if (typeof safeContent.text === 'string' && safeContent.text.includes('`⌜')) {
                    safeContent.text = beautifyLegacyCaption(safeContent.text);
                }
                if (typeof safeContent.caption === 'string' && safeContent.caption.includes('`⌜')) {
                    safeContent.caption = beautifyLegacyCaption(safeContent.caption);
                }
            }

            const now = Date.now();
            const lastSent = messageTimestamps.get(jid) || 0;

            if (now - lastSent < 50) await delay(50 - (now - lastSent));
            if (!userQueues[jid]) userQueues[jid] = Promise.resolve();

            userQueues[jid] = userQueues[jid].then(() => new Promise(async (resolve) => {
                try {
                    const trySendWithTransientRetry = async (opts) => {
                        try {
                            return await oriSend(jid, safeContent, opts);
                        } catch (e) {
                            const msgStr = String(e?.message || e || '');
                            if (/rate-overlimit|timed out|timeout|429/i.test(msgStr)) {
                                await delay(1500);
                                return await oriSend(jid, safeContent, opts);
                            }
                            throw e;
                        }
                    };
                    let result = null;
                    try {
                        result = await trySendWithTransientRetry(options);
                    } catch (firstErr) {
                        if (options && options.quoted) {
                            const { quoted, ...restOpts } = options;
                            result = await trySendWithTransientRetry(restOpts);
                        } else {
                            throw firstErr;
                        }
                    }
                    if (result && result.key && result.key.id) {
                        if (result.message) sentMessageCache.set(result.key.id, result.message);
                        global.sentKeys = global.sentKeys || new Set();
                        global.sentKeys.add(result.key.id);
                        if (global.sentKeys.size > 1500) {
                            const first = global.sentKeys.values().next().value;
                            global.sentKeys.delete(first);
                        }
                    }
                    messageTimestamps.set(jid, Date.now());
                    resolve(result);
                } catch (err) {
                    console.error(chalk.red(`[Jadibot ${number}] Send message error:`), err?.message || err);
                    resolve(null);
                }
            }));
            return userQueues[jid];
        };

        inst.socket = Dinz;
        inst.starting = false;
        if (!isRegistered && !opts.resume) {
            inst.status = 'pairing';
        } else {
            inst.status = 'connecting';
        }

        const r = loadRegistry();
        r[number] = r[number] || { config: {}, requester: requesterNum };
        r[number].status = inst.status;
        r[number].config = r[number].config || {};
        if (!r[number].createdAt) r[number].createdAt = Date.now();
        saveRegistry(r);

        if (!isRegistered && !opts.resume) {
            setTimeout(() => {
                if (!pairingRequested) requestPairing().catch(() => {});
            }, 15000);
        }

        return {
            ok: true,
            message: isRegistered || opts.resume
                ? `Memulai jadibot ${number} dari session tersimpan...`
                : `Membuat pairing untuk ${number}...`,
            code: inst.pairingCode || undefined
        };
    } catch (e) {
        console.error('[Jadibot] start error:', e);
        instances.delete(number);
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e2) {}
        return { ok: false, message: `Gagal start: ${e.message}` };
    }
}

async function stopJadibot(number, opts = {}) {
    number = normalizeNumber(number);
    const inst = instances.get(number);
    const reg = loadRegistry();
    if (!inst && !reg[number]) {
        return { ok: false, message: `Tidak ada jadibot dengan nomor *${number}*` };
    }

    clearPairingTimer(number);
    botCtx.saveJadibotMemoryDb(number);

    if (inst) {
        inst.status = 'stopped';
    }
    instances.delete(number);

    if (reg[number]) {
        reg[number].status = 'stopped';
        reg[number].stoppedByUser = true;
        saveRegistry(reg);
    }

    if (inst && inst.socket) {
        const sockToClose = inst.socket;
        if (opts.immediate) {
            try { sockToClose.ev.removeAllListeners(); } catch (e) {}
            try { sockToClose.end(undefined); } catch (e) {}
        } else {
            setTimeout(() => {
                try { sockToClose.ev.removeAllListeners(); } catch (e) {}
                try { sockToClose.end(undefined); } catch (e) {}
            }, 600);
        }
    }

    return {
        ok: true,
        message: `\`⌜ Stop Jadibot Berhasil ⌟\`\n> ◦ *Nomor Bot :* ${number}\n> ◦ *Status :* Dihentikan Sementara (Session & Database Disimpan)`
    };
}

async function restartJadibot(number) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    if (!reg[number] && !instances.has(number)) {
        return { ok: false, message: `Tidak ada jadibot dengan nomor *${number}*` };
    }

    const dir = sessionDir(number);
    if (!fs.existsSync(path.join(dir, 'creds.json'))) {
        return { ok: false, message: `Session *${number}* tidak ada/hilang. Jalankan *.jadibot ${number}* untuk pairing ulang.` };
    }

    if (instances.has(number)) {
        await stopJadibot(number, { immediate: true });
    }

    const freshReg = loadRegistry();
    freshReg[number] = freshReg[number] || { config: {}, requester: number };
    freshReg[number].status = 'stopped';
    freshReg[number].stoppedByUser = false;
    saveRegistry(freshReg);

    const startRes = await startJadibot(number, { resume: true, requester: freshReg[number].requester });
    if (!startRes.ok) return startRes;
    return {
        ok: true,
        message: `\`⌜ Restart Jadibot Berhasil ⌟\`\n> ◦ *Nomor Bot :* ${number}\n> ◦ *Status :* Sedang Menghubungkan Ulang...`
    };
}

async function deleteJadibot(number) {
    number = normalizeNumber(number);
    const reg = loadRegistry();
    const dir = sessionDir(number);
    const existed = Boolean(reg[number] || instances.has(number) || fs.existsSync(dir) || botCtx.hasJadibotData(number));

    if (!existed) {
        return { ok: false, message: `Tidak ada jadibot dengan nomor *${number}*` };
    }

    if (instances.has(number)) {
        await stopJadibot(number, { immediate: false });
    }

    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    botCtx.deleteJadibotData(number);

    const freshReg = loadRegistry();
    if (freshReg[number]) {
        delete freshReg[number];
        saveRegistry(freshReg);
    }

    return {
        ok: true,
        message: `\`⌜ Delete Jadibot Berhasil ⌟\`\n> ◦ *Nomor Bot :* ${number}\n> ◦ *Status :* Session & Database Clone Berhasil Dihapus Permanen`
    };
}

async function stopAllJadibot() {
    const numbers = [...new Set([...instances.keys(), ...Object.keys(loadRegistry())])];
    const results = [];
    for (const n of numbers) {
        const r = await stopJadibot(n);
        results.push(`${n}: ${r.message}`);
    }
    return { ok: true, message: results.length ? results.join('\n') : 'Tidak ada jadibot' };
}

async function deleteAllJadibot() {
    const numbers = [...new Set([...instances.keys(), ...Object.keys(loadRegistry())])];
    const results = [];
    for (const n of numbers) {
        const r = await deleteJadibot(n);
        results.push(`${n}: ${r.message}`);
    }
    return { ok: true, message: results.length ? results.join('\n') : 'Tidak ada jadibot' };
}

function listJadibot() {
    const reg = loadRegistry();
    const numbers = [...new Set([...Object.keys(reg), ...instances.keys()])];
    if (!numbers.length) {
        return { ok: true, empty: true, message: 'Belum ada jadibot' };
    }

    const lines = [];
    let idx = 1;
    for (const n of numbers) {
        const inst = instances.get(n);
        const entry = reg[n] || {};
        const status = inst ? inst.status : (entry.status || 'stopped');
        const statusIcon =
            status === 'running' ? '✅ running' :
            status === 'pairing' ? '🔗 pairing' :
            status === 'connecting' || status === 'starting' ? '🔄 connecting' :
            '⏸️ stopped';
        const id = botCtx.getJadibotIdentity(n);
        const botname = id.botname;
        const owner = id.owner;
        const since = entry.startedAt
            ? formatSince(entry.startedAt)
            : (entry.createdAt ? 'sejak ' + formatSince(entry.createdAt) : '-');
        const expInfo = entry.expiredAt
            ? `\n> ◦ Sisa Waktu : *${formatRemainingTime(entry.expiredAt)}* (${moment(entry.expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY')})`
            : '';
        const code = inst && inst.pairingCode
            ? `\n> ◦ Kode : *${inst.pairingCode.length === 8 ? inst.pairingCode.slice(0,4) + '-' + inst.pairingCode.slice(4) : inst.pairingCode}*`
            : '';
        lines.push(`${idx}. ${n} ${statusIcon}\n> ◦ Bot : *${botname}* | Owner : *${owner}*\n> ◦ Aktif : ${since}${expInfo}${code}`);
        idx++;
    }

    return {
        ok: true,
        empty: false,
        message: `📋 *List Jadibot (${numbers.length}/${MAX_JADIBOT})*\n\n` + lines.join('\n\n')
    };
}

function formatRemainingTime(expiredAt) {
    if (!expiredAt) return '-';
    const diff = expiredAt - Date.now();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (d > 0) return `${d} hari ${h} jam`;
    if (h > 0) return `${h} jam ${m} menit`;
    return `${Math.max(1, m)} menit`;
}

function formatSince(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    return `${d} hari lalu`;
}

async function checkExpiredJadibots() {
    try {
        const reg = loadRegistry();
        const now = Date.now();
        for (const [num, entry] of Object.entries(reg)) {
            if (entry && entry.expiredAt && now >= entry.expiredAt) {
                const ownerNum = normalizeNumber(entry.config?.owner || entry.requester || num);
                await deleteJadibot(num);
                if (global.socket && ownerNum) {
                    try {
                        await global.socket.sendMessage(`${ownerNum}@s.whatsapp.net`, {
                            text: `\`⌜ Jadibot Expired ⌟\`\n> ◦ *Nomor Bot :* ${num}\n> ◦ *Status :* Masa aktif jadibot telah habis dan sesi telah dihapus otomatis.`
                        });
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}
}

if (!global._jadibotExpireInterval) {
    global._jadibotExpireInterval = setInterval(checkExpiredJadibots, 60 * 1000);
}

async function resumeAllJadibot() {
    await checkExpiredJadibots();
    const reg = loadRegistry();
    const toResume = Object.entries(reg)
        .filter(([k, v]) => {
            const existing = instances.get(k);
            if (existing && (existing.status === 'running' || existing.status === 'pairing' || existing.starting)) {
                return false;
            }
            if (v.stoppedByUser) return false;
            const credsFile = path.join(sessionDir(k), 'creds.json');
            return fs.existsSync(credsFile);
        })
        .map(([k]) => k);

    if (!toResume.length) return;

    console.log(chalk.cyan(`[Jadibot] Resuming ${toResume.length} jadibot...`));
    for (const num of toResume) {
        try {
            await startJadibot(num, { resume: true, requester: reg[num]?.requester });
        } catch (e) {
            console.error(`[Jadibot] resume ${num} error:`, e.message);
        }
    }
}

function getJadibotInstance(number) {
    return instances.get(normalizeNumber(number)) || null;
}

function getRunningJadibotSockets() {
    const list = [];
    for (const inst of instances.values()) {
        if (inst.status === 'running' && inst.socket) {
            list.push(inst.socket);
        }
    }
    return list;
}

function isJadibotSocket(sock) {
    return !!(sock && sock.isJadibot);
}

function isSensitiveBlocked(Dinz, m, command) {
    if (!isJadibotSocket(Dinz)) return false;
    const cmd = String(command || '').toLowerCase();
    if (!SENSITIVE_COMMANDS.has(cmd)) return false;
    return true;
}

function getSensitiveBlockMessage(Dinz, m, command) {
    if (!isSensitiveBlocked(Dinz, m, command)) return null;
    const cmd = String(command || '').toLowerCase();
    if (MAIN_SETUP_COMMANDS.has(cmd)) {
        return (
            `🔒 *Fitur Khusus Bot Utama*\n` +
            `> ◦ Perintah *${cmd}* hanya untuk mengubah konfigurasi bot utama.\n` +
            `> ◦ Untuk mengubah identitas/media bot clone kamu secara terpisah, gunakan kategori *Menu Setup Cloner*:\n` +
            `> ◦ Ketik *menu cloner* atau *cekcloner*`
        );
    }
    return `🔒 *Akses Diblokir (Bot Clone)*\n> ◦ Fitur sensitif *${cmd}* tidak tersedia di jadibot/cloner demi keamanan bot utama & server.`;
}

function getJadibotLimits() {
    const rootDb = botCtx.getRootDb();
    const saved = rootDb?.settings?.jadibotLimits || {};
    const maxCloner = Number.isFinite(Number(saved.maxCloner)) && Number(saved.maxCloner) >= 0
        ? Math.floor(Number(saved.maxCloner))
        : MAX_JADIBOT;
    const broadcastCooldownMs = Number.isFinite(Number(saved.broadcastCooldownMs)) && Number(saved.broadcastCooldownMs) >= 0
        ? Math.floor(Number(saved.broadcastCooldownMs))
        : DEFAULT_CLONER_JPM_COOLDOWN_MS;
    return { maxCloner, broadcastCooldownMs };
}

function setJadibotLimits(patch = {}) {
    const rootDb = botCtx.getRootDb();
    if (!rootDb.settings || typeof rootDb.settings !== 'object') rootDb.settings = {};
    const cur = getJadibotLimits();
    const next = {
        maxCloner: patch.maxCloner !== undefined ? Math.max(0, Math.floor(Number(patch.maxCloner) || 0)) : cur.maxCloner,
        broadcastCooldownMs: patch.broadcastCooldownMs !== undefined ? Math.max(0, Math.floor(Number(patch.broadcastCooldownMs) || 0)) : cur.broadcastCooldownMs
    };
    rootDb.settings.jadibotLimits = next;
    botCtx.saveRootDb();
    return next;
}

function checkClonerBroadcastCooldown(Dinz, command) {
    if (!isJadibotSocket(Dinz)) return { blocked: false };
    const cmd = String(command || '').toLowerCase();
    if (!CLONER_BROADCAST_COMMANDS.has(cmd)) return { blocked: false };

    const { broadcastCooldownMs } = getJadibotLimits();
    if (broadcastCooldownMs <= 0) return { blocked: false };

    const num = normalizeNumber(Dinz.jadibotNumber);
    if (!num) return { blocked: false };

    const now = Date.now();
    const lastTs = clonerBroadcastTimestamps.get(num) || 0;
    const diff = now - lastTs;
    if (lastTs > 0 && diff < broadcastCooldownMs) {
        const remainSec = Math.ceil((broadcastCooldownMs - diff) / 1000);
        const mins = Math.floor(remainSec / 60);
        const secs = remainSec % 60;
        const waitText = mins > 0 ? `${mins} menit ${secs} detik` : `${secs} detik`;
        return {
            blocked: true,
            remainingMs: broadcastCooldownMs - diff,
            message:
                `🛡️ *Anti-Ban Broadcast Cloner*\n` +
                `> ◦ Command *${cmd}* sedang cooldown untuk mencegah ban WA pada server.\n` +
                `> ◦ Tunggu : *${waitText}* lagi sebelum broadcast berikutnya.`
        };
    }

    clonerBroadcastTimestamps.set(num, now);
    return { blocked: false };
}

function getClonerStats() {
    const reg = loadRegistry();
    const rootDb = botCtx.getRootDb();
    const limits = getJadibotLimits();
    const mem = process.memoryUsage();
    const allNumbers = [...new Set([...Object.keys(reg), ...instances.keys()])];

    const clones = allNumbers.map((num) => {
        const entry = reg[num] || {};
        const inst = instances.get(num);
        const id = botCtx.getJadibotIdentity(num);
        const cloneDb = rootDb?.jadibot?.clones?.[num] || {};
        const status = inst?.status || entry.status || 'stopped';
        return {
            number: num,
            status,
            botname: id.botname,
            owner: id.owner,
            users: Object.keys(cloneDb.users || {}).length,
            groups: Object.keys(cloneDb.groups || {}).length,
            remaining: entry.expiredAt ? formatRemainingTime(entry.expiredAt) : '-',
            startedAt: entry.startedAt || 0
        };
    });

    const activeCount = clones.filter((c) => c.status === 'running' || c.status === 'pairing').length;
    return {
        rssMb: (mem.rss / 1024 / 1024).toFixed(1),
        heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(1),
        uptimeSec: Math.floor(process.uptime()),
        limits,
        totalRegistered: clones.length,
        activeCount,
        clones
    };
}

module.exports = {
    SENSITIVE_COMMANDS,
    MAIN_SETUP_COMMANDS,
    CLONER_BROADCAST_COMMANDS,
    getSensitiveBlockMessage,
    getJadibotLimits,
    setJadibotLimits,
    checkClonerBroadcastCooldown,
    getClonerStats,
    startJadibot,
    stopJadibot,
    restartJadibot,
    deleteJadibot,
    stopAllJadibot,
    deleteAllJadibot,
    listJadibot,
    getJadibotConfig,
    setJadibotConfig,
    autoConfigureClone,
    resolveTargetJadibot,
    setPendingJadibotPrompt,
    getPendingJadibotPrompt,
    clearPendingJadibotPrompt,
    claimCommandExecution,
    getJadibotDb,
    setJadibotDb,
    getJadibotPayment,
    setJadibotPayment,
    getJadibotImage,
    setJadibotImage,
    getJadibotOwners,
    addJadibotOwner,
    delJadibotOwner,
    resumeAllJadibot,
    getJadibotInstance,
    getRunningJadibotSockets,
    isJadibotSocket,
    isSensitiveBlocked,
    formatRemainingTime,
    checkExpiredJadibots,
    loadRegistry,
    normalizeNumber,
    isValidNumber,
    MAX_JADIBOT
};
