const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const pino = require('pino');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    fetchLatestBaileysVersion,
    generateMessageID,
    delay
} = require('@whiskeysockets/baileys');

const botCtx = require('./context');
const DataBase = require('./database');
const mongo = require('./mongo');
const { useMongoAuthState } = require('./mongo-auth');
const { MessagesUpsert, Solving, recordLidMapping, recordLidPair } = require('./message');
const { startSchedulers } = require('./scheduler');
const jadibotMgr = require('../handlers/jadibot');
const { beautifyLegacyCaption } = require('../utils/formatter');
const { attachChatThemeHelpers } = require('../services/chat-theme');

chalk.level = 3;

const database = new DataBase();
const MAX_RECONNECT_ATTEMPTS = 10;
const BANNER_GRADIENT = ['#F43F5E', '#FB7185', '#FBBF24'];

let mainDbInitialized = false;
let shutdownHooksInstalled = false;
let currentBotNumber = null;
let reconnecting = false;
let botStarting = false;
let reconnectAttempts = 0;
let unregisteredCloseCount = 0;

function installGracefulShutdown() {
    if (shutdownHooksInstalled) return;
    shutdownHooksInstalled = true;

    let shuttingDown = false;
    const handleExitSignal = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        try {
            console.log(chalk.yellow(`\n[Shutdown] Menerima ${signal}, menyimpan database terakhir...`));
            await Promise.race([
                database.write(global.db, true),
                new Promise((resolve) => setTimeout(resolve, 5000))
            ]);
            const mongo = require('./mongo');
            await mongo.close().catch(() => {});
            try {
                const callEngine = require('../services/call-engine');
                callEngine.stopBridgeProcess();
            } catch (_) {}
            console.log(chalk.green('[Shutdown] Database berhasil disimpan.'));
        } catch (e) {
            console.error(chalk.red('[Shutdown] Gagal menyimpan database:'), e.message);
        } finally {
            process.exit(0);
        }
    };

    process.on('SIGINT', () => handleExitSignal('SIGINT'));
    process.on('SIGTERM', () => handleExitSignal('SIGTERM'));
}

global.autoFollowNewsletterId = global.autoFollowNewsletterId || '@newsletter';

function ensureRuntimeDirs() {
    for (const dir of ['./data', './tmp', './session', './jadibot-session']) {
        try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        } catch (_) {}
    }
}

function ensureFfmpegPath() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch (_) {
        try {
            const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
            if (ffmpegInstaller && ffmpegInstaller.path) {
                try { fs.chmodSync(ffmpegInstaller.path, 0o755); } catch {}
                const ffDir = path.dirname(ffmpegInstaller.path);
                if (!String(process.env.PATH || '').includes(ffDir)) {
                    process.env.PATH = `${process.env.PATH || ''}:${ffDir}`;
                }
            }
        } catch {}
    }
}

try {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
} catch (_) {}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function question(promptText) {
    return new Promise((resolve) => {
        try { process.stdout.write(promptText); } catch (_) {}
        rl.once('line', (line) => {
            resolve(String(line || '').replace(/[\r\n]+/g, '').trim());
        });
    });
}

function normalizeBotNumber(input) {
    if (!input) return '';
    let num = String(input).split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
    if (num.startsWith('08')) {
        num = '62' + num.slice(1);
    } else if (num.startsWith('8') && num.length >= 9 && num.length <= 13) {
        num = '62' + num;
    }
    return num;
}

function resolveFigletFont(fontName) {
    const raw = String(fontName || 'ANSI Shadow').trim();
    if (!raw) return 'ANSI Shadow';
    const normalized = raw.toLowerCase().replace(/[\s_-]+/g, '');
    if (normalized === 'larry3d') return 'Larry 3D';
    if (normalized === 'ansishadow') return 'ANSI Shadow';
    try {
        const fonts = figlet.fontsSync();
        const exact = fonts.find((f) => f.toLowerCase() === raw.toLowerCase());
        if (exact) return exact;
        const fuzzy = fonts.find((f) => f.toLowerCase().replace(/[\s_-]+/g, '') === normalized);
        if (fuzzy) return fuzzy;
    } catch (_) {}
    return raw;
}

function stripAnsi(str) {
    return String(str || '').replace(/\x1B\[[0-9;]*m/g, '');
}

function fitVisible(str, maxWidth) {
    const raw = String(str || '');
    const chars = [...raw];
    if (chars.length <= maxWidth) return raw;
    return chars.slice(0, Math.max(1, maxWidth - 1)).join('') + '…';
}

function padBoxRow(styledText, innerWidth, borderFn) {
    const visLen = [...stripAnsi(styledText)].length;
    const pad = Math.max(0, innerWidth - visLen);
    return borderFn('│') + styledText + ' '.repeat(pad) + borderFn('│');
}

function centerBoxRow(styledText, innerWidth, borderFn) {
    const visLen = [...stripAnsi(styledText)].length;
    const totalPad = Math.max(0, innerWidth - visLen);
    const leftPad = Math.floor(totalPad / 2);
    const rightPad = totalPad - leftPad;
    return borderFn('│') + ' '.repeat(leftPad) + styledText + ' '.repeat(rightPad) + borderFn('│');
}

function printBanner() {
    const botLabel = String(global.asciiName || global.botname || 'HuTao - MD').trim();
    const innerW = 44;
    const rule = '─'.repeat(innerW);

    const border = chalk.hex('#475569');
    const accent = chalk.hex('#F43F5E');
    const gold = chalk.hex('#FBBF24').bold;
    const muted = chalk.hex('#94A3B8');
    const val = chalk.hex('#F8FAFC').bold;
    const tag = chalk.hex('#CBD5E1');

    const logoLines = [
        '█ █ █ █ ▀█▀ ▄▀▄ █▀█     █▄ ▄█ █▀▄',
        '█▀█ █ █  █  █▀█ █ █  ━  █ ▀ █ █ █',
        '▀ ▀ ▀▀▀  ▀  ▀ ▀ ▀▀▀     ▀   ▀ ▀▀ '
    ];

    const dbMode = String(database.getMode ? database.getMode() : 'local').toUpperCase();
    const modeLabel = global.db?.settings?.isPublic === false ? 'Self' : 'Public';
    const prefixLabel = global.db?.settings?.prefixMode === 'single'
        ? `Single (${global.db?.settings?.prefix || '.'})`
        : (global.db?.settings?.prefixMode === 'noprefix' ? 'No Prefix' : 'Multi Prefix');

    const infoRow = (label, value) => {
        const keyPart = `  ${label.padEnd(8)} : `;
        const maxValLen = innerW - keyPart.length - 1;
        return padBoxRow(muted(keyPart) + val(fitVisible(value, maxValLen)), innerW, border);
    };

    const lines = [
        '',
        border(`╭${rule}╮`),
        padBoxRow('', innerW, border),
        ...logoLines.map((line, i) =>
            centerBoxRow(chalk.hex(BANNER_GRADIENT[i % BANNER_GRADIENT.length]).bold(line), innerW, border)
        ),
        padBoxRow('', innerW, border),
        centerBoxRow(gold(fitVisible(botLabel, 18)) + accent(' • ') + tag('Multi-Device Bot'), innerW, border),
        border(`├${rule}┤`),
        infoRow('Engine', 'Baileys Multi-Device'),
        infoRow('Owner', `${global.namaOwner || 'DinzID'} (${global.owner || '-'})`),
        infoRow('Runtime', `Node ${process.version} • v${global.versi || '1.0.0'}`),
        infoRow('Mode', `${modeLabel} • ${prefixLabel}`),
        infoRow('Storage', dbMode === 'MONGODB' ? 'MongoDB Cloud + JSON' : 'Local JSON'),
        border(`╰${rule}╯`),
        ''
    ];

    console.log(lines.join('\n'));
}

function getQRLink(qr) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' + encodeURIComponent(qr);
}

function parseNewsletterJids(raw) {
    const source = String(raw || global.autoFollowNewsletterId || '');
    return source
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            if (/^\d{10,30}$/.test(item)) return item + '@newsletter';
            if (item.endsWith('@newsletter')) return item;
            const digits = item.replace(/[^0-9]/g, '');
            return digits.length >= 10 ? digits + '@newsletter' : '';
        })
        .filter(Boolean);
}

async function followConfiguredNewsletters(sock, newsletterInput) {
    const jids = parseNewsletterJids(newsletterInput);
    if (!jids.length) return;

    const targetSock = sock || global.socket;
    if (targetSock && typeof targetSock.newsletterFollow === 'function') {
        for (const jid of jids) {
            try { await targetSock.newsletterFollow(jid); } catch (_) {}
        }
    }

    try {
        if (jadibotMgr && typeof jadibotMgr.getRunningJadibotSockets === 'function') {
            for (const jSock of jadibotMgr.getRunningJadibotSockets()) {
                if (jSock && typeof jSock.newsletterFollow === 'function') {
                    for (const jid of jids) {
                        await jSock.newsletterFollow(jid).catch(() => {});
                    }
                }
            }
        }
    } catch (_) {}
}

async function initMainDatabase() {
    if (mainDbInitialized) return;
    try {
        const loadedDb = await database.read();
        if (!loadedDb.settings) loadedDb.settings = {};
        if (typeof loadedDb.settings.audiomenu === 'undefined' || loadedDb.settings.audiomenu === null) {
            loadedDb.settings.audiomenu = true;
        }
        await database.write(loadedDb, false);
        const mode = String(database.getMode ? database.getMode() : 'local').toUpperCase();
        console.log(
            chalk.green(
                mode === 'MONGODB'
                    ? '[Database] Siap [MONGODB Cloud + Cache Lokal data/database.json]'
                    : '[Database] Siap [LOKAL data/database.json]'
            )
        );
        installGracefulShutdown();
        mainDbInitialized = true;
    } catch (e) {
        console.error(chalk.red('[Database] Gagal memuat database:'), e.message);
        process.exit(1);
    }
}

async function handleGroupParticipantsUpdate(sock, anu) {
    try {
        const { id, participants, action } = anu;
        const groupSettings = global.db.groups?.[id];
        if (!groupSettings) return;

        await delay(1500);
        const metadata = await sock.groupMetadata(id).catch(() => null);
        if (!metadata || !metadata.subject) return;
        if (metadata.participants) recordLidMapping(metadata.participants, metadata, sock);

        const groupName = metadata.subject;
        const totalMember = metadata.participants?.length || 0;

        const resolveParticipantJid = (participant) => {
            if (participant.endsWith('@lid')) {
                const found = metadata?.participants?.find((p) => p.lid === participant || p.id === participant);
                return found && found.jid ? found.jid : participant;
            }
            return participant;
        };

        if (groupSettings.welcome && action === 'add') {
            const welcomeDb = botCtx.getSection('welcome', sock) || {};
            for (const num of participants) {
                try {
                    const jid = resolveParticipantJid(num);
                    const template =
                        welcomeDb[id]?.welcomeText || 'Halo @user, selamat datang di @group, Kamu Member ke *@totalmember*';
                    const dateNow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                    const text = template
                        .replace(/@user/g, '@' + jid.split('@')[0])
                        .replace(/@group/g, groupName)
                        .replace(/@totalmember/g, totalMember)
                        .replace(/@datenow/g, dateNow);
                    const imgUrl = welcomeDb[id]?.welcomeImage || global.image?.menu;

                    if (imgUrl) {
                        await sock.sendMessage(id, {
                            image: { url: imgUrl },
                            caption: text,
                            contextInfo: { mentionedJid: [jid] }
                        });
                    } else {
                        await sock.sendMessage(id, {
                            text,
                            contextInfo: { mentionedJid: [jid] }
                        });
                    }
                } catch (e) {
                    console.log('[Welcome] Gagal mengirim pesan:', e.message);
                }
            }
        } else if (groupSettings.left && action === 'remove') {
            const leftDb = botCtx.getSection('left', sock) || {};
            for (const num of participants) {
                try {
                    const jid = resolveParticipantJid(num);
                    const template = leftDb[id]?.leftText || '@user telah keluar dari @group';
                    const dateNow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                    const text = template
                        .replace(/@user/g, '@' + jid.split('@')[0])
                        .replace(/@group/g, groupName)
                        .replace(/@totalmember/g, totalMember)
                        .replace(/@datenow/g, dateNow);
                    const imgUrl = leftDb[id]?.leftImage || global.image?.menu;

                    if (imgUrl) {
                        await sock.sendMessage(id, {
                            image: { url: imgUrl },
                            caption: text,
                            contextInfo: { mentionedJid: [jid] }
                        });
                    } else {
                        await sock.sendMessage(id, {
                            text,
                            contextInfo: { mentionedJid: [jid] }
                        });
                    }
                } catch (e) {
                    console.log('[Left] Gagal mengirim pesan:', e.message);
                }
            }
        }
    } catch (err) {
        console.log(chalk.yellow('[Group Event] Error:'), err.message);
    }
}

function normalizeMentionList(rawList) {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    const out = [];
    const seenExact = new Set();
    const seenCanonical = new Set();

    for (const item of rawList) {
        if (!item || typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        const cleanJid = trimmed.replace(/:\d+@/, '@');
        if (seenExact.has(cleanJid)) continue;

        const userDigits = cleanJid.split('@')[0].replace(/[^0-9]/g, '');
        const mappedPhone = userDigits && global.lidMap && global.lidMap[userDigits]
            ? global.lidMap[userDigits]
            : userDigits;
        const canonicalKey = mappedPhone || cleanJid;
        if (seenCanonical.has(canonicalKey)) continue;

        seenExact.add(cleanJid);
        seenCanonical.add(canonicalKey);
        out.push(cleanJid);
    }

    return out;
}

function sanitizeMessagePayload(content) {
    if (!content || typeof content !== 'object') return content;
    const cloned = { ...content };

    const topMentions = Array.isArray(cloned.mentions) ? cloned.mentions : [];
    const existingCtx = (cloned.contextInfo && typeof cloned.contextInfo === 'object') ? { ...cloned.contextInfo } : null;
    const prevMentions = existingCtx && Array.isArray(existingCtx.mentionedJid) ? existingCtx.mentionedJid : [];

    if (topMentions.length > 0 || prevMentions.length > 0) {
        const mergedMentions = normalizeMentionList([...prevMentions, ...topMentions]);
        cloned.contextInfo = {
            ...(existingCtx || {}),
            mentionedJid: mergedMentions
        };
    }
    if ('mentions' in cloned) {
        delete cloned.mentions;
    }

    if ('jpegThumbnail' in cloned && (!Buffer.isBuffer(cloned.jpegThumbnail) || cloned.jpegThumbnail.length === 0)) {
        delete cloned.jpegThumbnail;
    }

    if (typeof cloned.text === 'string' && cloned.text.includes('`⌜')) {
        cloned.text = beautifyLegacyCaption(cloned.text);
    }
    if (typeof cloned.caption === 'string' && cloned.caption.includes('`⌜')) {
        cloned.caption = beautifyLegacyCaption(cloned.caption);
    }

    return cloned;
}

function recordSentBotMessage(msgId, message, sentMessageCache) {
    if (!msgId) return;
    global.sentKeys = global.sentKeys || new Set();
    global.sentKeys.add(msgId);
    if (global.sentKeys.size > 3000) {
        const firstKey = global.sentKeys.values().next().value;
        global.sentKeys.delete(firstKey);
    }
    if (message && sentMessageCache) {
        sentMessageCache.set(msgId, message);
    }
}

function wrapQueuedSendMessage(sock, sentMessageCache) {
    const sendQueues = {};
    const lastSendTime = new Map();
    const originalSendMessage = sock.sendMessage.bind(sock);

    if (typeof sock.relayMessage === 'function') {
        const originalRelayMessage = sock.relayMessage.bind(sock);
        sock.relayMessage = async (jid, message, opts = {}) => {
            let targetJid = jid;
            if (!opts?.participant && typeof targetJid === 'string' && targetJid.endsWith('@lid')) {
                const lidDigits = targetJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (lidDigits && global.lidMap && global.lidMap[lidDigits]) {
                    targetJid = `${global.lidMap[lidDigits]}@s.whatsapp.net`;
                }
            }
            const msgId = opts?.messageId || (typeof generateMessageID === 'function' ? generateMessageID() : undefined);
            recordSentBotMessage(msgId, message, sentMessageCache);
            return originalRelayMessage(targetJid, message, {
                ...opts,
                ...(msgId ? { messageId: msgId } : {}),
                AI: opts?.AI === true
            });
        };
    }

    sock.sendMessage = async (jid, content, options) => {
        let targetJid = jid;
        if (typeof targetJid === 'string' && targetJid.endsWith('@lid')) {
            const lidDigits = targetJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            if (lidDigits && global.lidMap && global.lidMap[lidDigits]) {
                targetJid = `${global.lidMap[lidDigits]}@s.whatsapp.net`;
            }
        }
        const safeContent = sanitizeMessagePayload(content);

        if (safeContent && typeof safeContent === 'object' && safeContent.react && Object.keys(safeContent).length === 1) {
            try {
                const sentReact = await originalSendMessage(targetJid, safeContent, options);
                if (sentReact && sentReact.key && sentReact.key.id) {
                    recordSentBotMessage(sentReact.key.id, sentReact.message, sentMessageCache);
                }
                return sentReact;
            } catch (_) {
                return null;
            }
        }

        const now = Date.now();
        const prev = lastSendTime.get(targetJid) || 0;
        if (now - prev < 15) {
            await delay(15 - (now - prev));
        }
        if (!sendQueues[targetJid]) {
            sendQueues[targetJid] = Promise.resolve();
        }
        sendQueues[targetJid] = sendQueues[targetJid].then(() => {
            return new Promise(async (resolve) => {
                try {
                    let sent = null;
                    const trySendWithTransientRetry = async (opts) => {
                        try {
                            return await originalSendMessage(targetJid, safeContent, opts);
                        } catch (e) {
                            const msgStr = String(e?.message || e || '');
                            if (/rate-overlimit|timed out|timeout|429/i.test(msgStr)) {
                                await delay(1500);
                                return await originalSendMessage(targetJid, safeContent, opts);
                            }
                            throw e;
                        }
                    };
                    try {
                        sent = await trySendWithTransientRetry(options);
                    } catch (firstErr) {
                        if (options && options.quoted) {
                            const { quoted, ...restOpts } = options;
                            sent = await trySendWithTransientRetry(restOpts);
                        } else {
                            throw firstErr;
                        }
                    }
                    if (sent && sent.key && sent.key.id) {
                        recordSentBotMessage(sent.key.id, sent.message, sentMessageCache);
                    }
                    lastSendTime.set(targetJid, Date.now());
                    resolve(sent);
                } catch (err) {
                    console.error(chalk.red('[Send Error]'), err?.message || err);
                    resolve(null);
                }
            });
        });
        return sendQueues[targetJid];
    };
}

async function startBot() {
    if (botStarting) return global.socket;
    botStarting = true;
    try {
        return await _startBotInner();
    } finally {
        botStarting = false;
    }
}

async function _startBotInner() {
    ensureRuntimeDirs();
    ensureFfmpegPath();
    await initMainDatabase();

    if (global.socket) {
        try {
            global.socket.ev.removeAllListeners();
            global.socket.ws?.close();
        } catch (_) {}
        global.socket = null;
    }

    let loginMethod = '1';
    let verifiedNumber = '';

    let authBundle = null;
    if (mongo.isConfigured() && global.mongoSession !== false) {
        try {
            authBundle = await useMongoAuthState('main', 'session');
        } catch (e) {
            console.warn(chalk.yellow('[MongoAuth] Fallback ke session lokal:'), e.message);
        }
    }

    let state;
    let saveCreds;
    let clearAuthSession;
    if (authBundle && authBundle.state) {
        ({ state, saveCreds } = authBundle);
        clearAuthSession = authBundle.clearSession;
        global._authSessionMode = 'mongodb';
        console.log(chalk.green('[Session] Menggunakan MongoDB Cloud Auth State'));
    } else {
        ({ state, saveCreds } = await useMultiFileAuthState('session'));
        clearAuthSession = async () => {
            try { fs.rmSync('session', { recursive: true, force: true }); } catch (_) {}
        };
        global._authSessionMode = 'local';
    }
    const isRegistered = !!state.creds?.registered;
    let sessionWasRegistered = isRegistered;

    if (!isRegistered) {
        console.clear();
        printBanner();
        console.log('');

        console.log(chalk.hex('#00BBF9').bold('Metode koneksi:'));
        console.log(chalk.hex('#C77DFF').bold('1. Pairing Code'));
        console.log(chalk.hex('#C77DFF').bold('2. Scan QR'));

        try {
            const choice = await question(chalk.hex('#FFD166').bold('> '));
            loginMethod = choice.trim() === '2' ? '2' : '1';
        } catch (_) {
            loginMethod = '1';
        }

        if (loginMethod === '1') {
            while (!verifiedNumber) {
                let inputNumber = '';
                try {
                    inputNumber = await question(
                        chalk.hex('#00F5D4').bold('# Masukkan Nomor WhatsApp\nContoh : 62812XXX\n> ')
                    );
                } catch (_) {}

                const normalized = normalizeBotNumber(inputNumber);
                if (!normalized || normalized.length < 8) {
                    console.log(
                        chalk.bgRed.white.bold(
                            `\n Format nomor (${inputNumber}) tidak valid! Contoh: 62812xxx\n`
                        )
                    );
                    continue;
                }

                verifiedNumber = normalized;
                console.log(chalk.bgGreen.white.bold('\n Nomor siap digunakan untuk pairing!\n'));
            }
        }
    } else {
        printBanner();
        const sessionNumber = normalizeBotNumber(state.creds.me?.id);
        if (!sessionNumber) {
            console.log(
                chalk.bgRed.white.bold(
                    '\n Session tidak memiliki identitas nomor yang valid! Menghapus session untuk login ulang...\n'
                )
            );
            await clearAuthSession().catch(() => {});
            setTimeout(() => process.exit(1), 1500);
            return;
        }
        currentBotNumber = sessionNumber;
    }

    const store = await makeInMemoryStore({
        logger: pino().child({ level: 'silent', stream: 'store' })
    });
    const sentMessageCache = new NodeCache({ stdTTL: 21600, checkperiod: 300, maxKeys: 3000, useClones: false });
    const msgRetryCounterCache = new NodeCache({ stdTTL: 1800, checkperiod: 180, useClones: false });
    const userDevicesCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
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
                const relayHit = global._baileysSentCache?.get(key.id);
                if (relayHit?.msg) return relayHit.msg;
                const loaded = await store.loadMessage(key.remoteJid, key.id);
                if (loaded?.message) return loaded.message;
                const rawDigits = String(key.remoteJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (rawDigits) {
                    const altJids = [];
                    if (global.lidMap?.[rawDigits]) altJids.push(`${global.lidMap[rawDigits]}@s.whatsapp.net`);
                    if (global.phoneToLidMap?.[rawDigits]) altJids.push(`${global.phoneToLidMap[rawDigits]}@lid`);
                    for (const alt of altJids) {
                        const altLoaded = await store.loadMessage(alt, key.id);
                        if (altLoaded?.message) return altLoaded.message;
                    }
                }
            } catch (_) {}
            return undefined;
        },
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 25000,
        defaultQueryTimeoutMs: 60000
    });
    attachChatThemeHelpers(sock);

    const wipeSessionFolder = async () => {
        try { await clearAuthSession(); } catch (_) {}
        try { fs.rmSync('session', { recursive: true, force: true }); } catch (_) {}
        currentBotNumber = null;
        reconnectAttempts = 0;
        unregisteredCloseCount = 0;
    };

    const scheduleFreshPairingRestart = async (reasonLabel) => {
        if (reconnecting) return;
        reconnecting = true;
        console.log(chalk.hex('#FFB703').bold(`\n[Smart Pairing] ${reasonLabel}`));
        console.log(chalk.hex('#94A3B8')('[Smart Pairing] Menghapus folder session rusak & memulai ulang pairing otomatis dalam 2 detik...\n'));
        await wipeSessionFolder();
        setTimeout(async () => {
            try {
                if (global.socket) {
                    try {
                        global.socket.ev.removeAllListeners();
                        global.socket.ws?.close();
                    } catch (_) {}
                }
                await startBot();
            } catch (e) {
                console.error(chalk.red('[Smart Pairing] Gagal restart pairing:'), e.message);
            } finally {
                reconnecting = false;
            }
        }, 2000);
    };

    const groupCache = new NodeCache({ stdTTL: 300, checkperiod: 120, useClones: false });
    const staleGroupCache = new Map();
    const inflightGroupMeta = new Map();
    sock.safeGroupMetadata = async (jid) => {
        const cached = groupCache.get(jid);
        if (cached) return cached;
        if (inflightGroupMeta.has(jid)) return inflightGroupMeta.get(jid);
        const p = (async () => {
            try {
                const metadata = await sock.groupMetadata(jid);
                groupCache.set(jid, metadata);
                staleGroupCache.set(jid, metadata);
                if (staleGroupCache.size > 500) {
                    const oldest = staleGroupCache.keys().next().value;
                    staleGroupCache.delete(oldest);
                }
                return metadata;
            } catch (err) {
                if (staleGroupCache.has(jid)) {
                    return staleGroupCache.get(jid);
                }
                console.error(chalk.yellow('[Group Metadata Error]'), err.message);
                return { id: jid, subject: 'Unknown', participants: [] };
            } finally {
                inflightGroupMeta.delete(jid);
            }
        })();
        inflightGroupMeta.set(jid, p);
        return p;
    };
    sock.ev.on('group-participants.update', (u) => { if (u?.id) groupCache.del(u.id); });
    sock.ev.on('groups.update', (updates) => {
        if (Array.isArray(updates)) updates.forEach((u) => { if (u?.id) groupCache.del(u.id); });
    });

    if (!isRegistered && loginMethod === '1' && verifiedNumber) {
        setTimeout(async () => {
            try {
                if (sock !== global.socket || sock.authState?.creds?.registered) return;
                const code = await sock.requestPairingCode(verifiedNumber, global.custompairing);
                const prettyCode = code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
                const b = chalk.hex('#475569');
                const w = 44;
                const r = '─'.repeat(w);
                console.log(
                    [
                        '',
                        b(`╭${r}╮`),
                        padBoxRow('  ' + chalk.hex('#FBBF24').bold('PAIRING CODE : ') + chalk.hex('#10B981').bold(prettyCode), w, b),
                        padBoxRow('  ' + chalk.hex('#94A3B8')(`Nomor        : +${verifiedNumber}`), w, b),
                        b(`╰${r}╯`),
                        ''
                    ].join('\n')
                );
                currentBotNumber = verifiedNumber;
            } catch (pairErr) {
                console.error(chalk.red('[Pairing Error]'), pairErr?.message || pairErr);
                if (!sessionWasRegistered && !sock.authState?.creds?.registered) {
                    await scheduleFreshPairingRestart('Gagal meminta kode pairing (koneksi terputus / nomor bermasalah).');
                }
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && loginMethod === '2') {
            const qrUrl = getQRLink(qr);
            console.log(chalk.green.bold('\nLink QR: ') + chalk.white.bold(qrUrl));
            console.log(chalk.yellow.bold('Silakan buka link dan scan QR\n'));
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const errMsg = lastDisconnect?.error?.message || 'Unknown';
            const currentlyRegistered = Boolean(sock.authState?.creds?.registered);
            const hasValidSession = sessionWasRegistered || currentlyRegistered;
            console.log(chalk.hex('#FBBF24')(`[Connection] Terputus — kode: ${statusCode || 'Unknown'} (${errMsg})`));

            if (!hasValidSession && statusCode !== DisconnectReason.restartRequired && statusCode !== 515) {
                unregisteredCloseCount++;
                await scheduleFreshPairingRestart(`Pairing gagal atau terputus sebelum selesai (kode ${statusCode || 'closed'}).`);
                return;
            }

            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                await scheduleFreshPairingRestart(`Perangkat dikeluarkan oleh WhatsApp (Logged Out / kode ${statusCode}).`);
                return;
            }

            if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
                console.log(chalk.red('[Connection] Koneksi tertimpa (440). Menunggu 15 detik sebelum menyambung ulang (session tetap aman)...'));
                if (!reconnecting) {
                    reconnecting = true;
                    setTimeout(async () => {
                        try {
                            await startBot();
                        } catch (e) {
                            console.error(chalk.red('[Reconnect 440] Gagal:'), e.message);
                        } finally {
                            reconnecting = false;
                        }
                    }, 15000);
                }
                return;
            }

            if (!reconnecting) {
                reconnecting = true;
                reconnectAttempts++;
                const cappedAttempt = Math.min(reconnectAttempts, MAX_RECONNECT_ATTEMPTS);
                const waitMs = statusCode === 515
                    ? 1500
                    : (statusCode === 429 || /rate/i.test(errMsg)
                        ? Math.min(15000 * cappedAttempt, 60000)
                        : Math.min(3500 * Math.pow(1.4, cappedAttempt), 45000));
                console.log(
                    chalk.hex('#94A3B8')(
                        `[Reconnect] Menyambung ulang (#${reconnectAttempts}) dalam ${(waitMs / 1000).toFixed(1)}s (session aman)...`
                    )
                );
                setTimeout(async () => {
                    try {
                        await startBot();
                    } catch (e) {
                        console.error(chalk.red('[Reconnect] Gagal:'), e.message);
                    } finally {
                        reconnecting = false;
                    }
                }, waitMs);
            }
        } else if (connection === 'open') {
            sessionWasRegistered = true;
            reconnectAttempts = 0;
            unregisteredCloseCount = 0;
            const connectedNumber = normalizeBotNumber(sock.user?.id || state.creds.me?.id);
            const connectedLid = sock.user?.lid ? String(sock.user.lid).split(':')[0] : '-';

            if (verifiedNumber && connectedNumber && connectedNumber !== verifiedNumber) {
                await scheduleFreshPairingRestart(`Nomor terhubung (${connectedNumber}) berbeda dengan nomor pairing (${verifiedNumber}).`);
                return;
            }

            if (connectedNumber) {
                currentBotNumber = connectedNumber;
            }

            const nowWib = moment().tz(global.timezone || 'Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss [WIB]');
            const okB = chalk.hex('#10B981');
            const w = 44;
            const r = '─'.repeat(w);
            console.log(
                [
                    '',
                    okB(`╭${r}╮`),
                    padBoxRow('  ' + chalk.hex('#10B981').bold('● ONLINE ') + chalk.white.bold(fitVisible(`${global.botname || 'HuTao - MD'} Ready`, 31)), w, okB),
                    padBoxRow('  ' + chalk.hex('#94A3B8')('Nomor : ') + chalk.white(fitVisible(`+${connectedNumber || '-'}`, 34)), w, okB),
                    padBoxRow('  ' + chalk.hex('#94A3B8')('LID   : ') + chalk.white(fitVisible(connectedLid, 34)), w, okB),
                    padBoxRow('  ' + chalk.hex('#94A3B8')('Waktu : ') + chalk.white(fitVisible(nowWib, 34)), w, okB),
                    okB(`╰${r}╯`),
                    ''
                ].join('\n')
            );

            try {
                await followConfiguredNewsletters(sock, global.autoFollowNewsletterId);
            } catch (_) {}

            try {
                const callEngine = require('../services/call-engine');
                if (callEngine.isBinaryInstalled()) {
                    callEngine.ensureRunning().catch((err) => {
                        console.warn(chalk.yellow('[CallEngine] Auto-start info:'), err?.message || err);
                    });
                }
            } catch (_) {}

            if (!global.jadibotResumed) {
                global.jadibotResumed = true;
                setTimeout(() => {
                    jadibotMgr.resumeAllJadibot().catch((err) => {
                        console.error('[Jadibot] Resume error:', err.message);
                    });
                }, 5000);
            }
        }
    });

    await store.bind(sock.ev);
    // Prune store.messages setiap 10 menit agar RAM tidak membengkak & GC tetap ringan
    if (global._mainStorePruneTimer) clearInterval(global._mainStorePruneTimer);
    global._mainStorePruneTimer = setInterval(() => {
        try {
            if (!store?.messages) return;
            for (const jid of Object.keys(store.messages)) {
                const dict = store.messages[jid];
                if (dict?.array && dict.array.length > 150) {
                    dict.array.splice(0, dict.array.length - 150);
                }
            }
        } catch (_) {}
    }, 10 * 60 * 1000);
    if (typeof global._mainStorePruneTimer.unref === 'function') global._mainStorePruneTimer.unref();

    await Solving(sock, store);
    global.socket = sock;

    startSchedulers(database);

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await MessagesUpsert(sock, chatUpdate, store);
        } catch (err) {
            console.error(chalk.red('[Messages Upsert Error]'), err);
        }
    });

    sock.ev.on('group-participants.update', (anu) => handleGroupParticipantsUpdate(sock, anu));

    const captureContactsLid = (contacts) => {
        if (!Array.isArray(contacts)) return;
        for (const c of contacts) {
            if (!c) continue;
            const cName = c.notify || c.name || c.verifiedName || '';
            if (c.id && c.lid) recordLidPair(c.lid, c.id, cName, sock);
            else if (c.id && cName) recordLidPair('', c.id, cName, sock);
        }
    };
    sock.ev.on('contacts.upsert', captureContactsLid);
    sock.ev.on('contacts.update', captureContactsLid);

    try {
        require('../services/presence').attachPresenceListener(sock);
    } catch (_) {}

    wrapQueuedSendMessage(sock, sentMessageCache);

    return sock;
}

module.exports = { startBot, normalizeBotNumber };
