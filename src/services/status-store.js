const fs = require('fs');
const path = require('path');
const { getContentType, downloadContentFromMessage } = require('@whiskeysockets/baileys');

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'sw-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 jam (masa aktif Status WhatsApp)
const MAX_TOTAL_ENTRIES = 400;
const MAX_PER_SENDER = 25;

let cacheLoaded = false;
let saveTimer = null;
// Map<botKey, Array<StatusEntry>>
const memoryStore = (global._swStatusStore = global._swStatusStore || new Map());

function getBotKey(Dinz) {
    return Dinz?.isJadibot && Dinz?.jadibotNumber ? String(Dinz.jadibotNumber) : 'main';
}

function normalizeDigits(raw) {
    let s = String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (s.startsWith('08')) s = '62' + s.slice(1);
    else if (s.startsWith('8') && s.length >= 9 && s.length <= 13) s = '62' + s;
    return s;
}

function serializeWithBuffers(obj) {
    return JSON.stringify(obj, (key, val) => {
        if (val && typeof val === 'object') {
            if (Buffer.isBuffer(val)) {
                return { __swB64: val.toString('base64') };
            }
            if (val.type === 'Buffer' && Array.isArray(val.data)) {
                return { __swB64: Buffer.from(val.data).toString('base64') };
            }
            if (ArrayBuffer.isView(val)) {
                return { __swB64: Buffer.from(val.buffer, val.byteOffset, val.byteLength).toString('base64') };
            }
        }
        return val;
    });
}

function deserializeWithBuffers(jsonStr) {
    return JSON.parse(jsonStr, (key, val) => {
        if (val && typeof val === 'object' && typeof val.__swB64 === 'string' && Object.keys(val).length === 1) {
            return Buffer.from(val.__swB64, 'base64');
        }
        return val;
    });
}

function loadFromDisk() {
    if (cacheLoaded) return;
    cacheLoaded = true;
    try {
        if (!fs.existsSync(CACHE_FILE)) return;
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        if (!raw) return;
        const parsed = deserializeWithBuffers(raw);
        if (!parsed || typeof parsed !== 'object') return;
        const now = Date.now();
        for (const [botKey, list] of Object.entries(parsed)) {
            if (!Array.isArray(list)) continue;
            const fresh = list.filter((e) => e && (now - Number(e.capturedAt || 0)) < TTL_MS);
            if (fresh.length > 0) memoryStore.set(botKey, fresh);
        }
    } catch (_) {}
}

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            const out = {};
            const now = Date.now();
            for (const [k, list] of memoryStore.entries()) {
                const fresh = (list || []).filter((e) => e && (now - Number(e.capturedAt || 0)) < TTL_MS).slice(-MAX_TOTAL_ENTRIES);
                if (fresh.length > 0) out[k] = fresh;
            }
            fs.writeFileSync(CACHE_FILE, serializeWithBuffers(out), 'utf8');
        } catch (_) {}
    }, 4000);
    if (typeof saveTimer.unref === 'function') saveTimer.unref();
}

function unwrapStatusMessage(rawMessage) {
    let cur = rawMessage;
    for (let i = 0; i < 4; i++) {
        if (!cur || typeof cur !== 'object') break;
        if (cur.ephemeralMessage?.message) { cur = cur.ephemeralMessage.message; continue; }
        if (cur.viewOnceMessage?.message) { cur = cur.viewOnceMessage.message; continue; }
        if (cur.viewOnceMessageV2?.message) { cur = cur.viewOnceMessageV2.message; continue; }
        if (cur.viewOnceMessageV2Extension?.message) { cur = cur.viewOnceMessageV2Extension.message; continue; }
        if (cur.documentWithCaptionMessage?.message) { cur = cur.documentWithCaptionMessage.message; continue; }
        break;
    }
    return cur;
}

function resolveStatusSender(msg, store) {
    const candidates = [
        msg.key?.participantAlt,
        msg.participantPn,
        msg.key?.participant,
        msg.participant
    ].filter(Boolean).map(String);

    let phone = '';
    let lid = '';
    for (const c of candidates) {
        const clean = c.split(':')[0];
        const digits = clean.split('@')[0].replace(/[^0-9]/g, '');
        if (!digits) continue;
        if (clean.endsWith('@lid') || digits.length > 14) {
            if (!lid) lid = digits;
            if (!phone && global.lidMap?.[digits]) phone = normalizeDigits(global.lidMap[digits]);
        } else {
            if (!phone) phone = normalizeDigits(digits);
        }
    }

    if (!phone && lid && global.lidMap?.[lid]) {
        phone = normalizeDigits(global.lidMap[lid]);
    }
    if (!lid && phone && global.phoneToLidMap?.[phone]) {
        lid = String(global.phoneToLidMap[phone]);
    }

    let contactName = String(msg.pushName || msg.verifiedBizName || '').trim();
    if (!contactName || contactName === 'User') {
        const contactObj = store?.contacts?.[`${phone}@s.whatsapp.net`] || store?.contacts?.[`${lid}@lid`] || null;
        contactName = contactObj?.name || contactObj?.notify || contactObj?.verifiedName || global.lidNames?.[phone] || global.lidNames?.[lid] || '';
    }

    return {
        phone,
        lid,
        name: contactName || phone || lid || 'Kontak'
    };
}

function captureStatus(Dinz, msg, store = null) {
    try {
        loadFromDisk();
        if (!msg || msg.key?.remoteJid !== 'status@broadcast') return false;
        if (!msg.message) return false;

        const botKey = getBotKey(Dinz);
        const unwrapped = unwrapStatusMessage(msg.message);
        if (!unwrapped) return false;

        const mType = getContentType(unwrapped) || Object.keys(unwrapped)[0];
        if (!mType) return false;

        // Hapus dari cache jika pemilik menghapus statusnya
        if (mType === 'protocolMessage') {
            const protoMsg = unwrapped.protocolMessage;
            if (protoMsg?.type === 0 && protoMsg?.key?.id) {
                const list = memoryStore.get(botKey) || [];
                const filtered = list.filter((e) => e.id !== protoMsg.key.id);
                memoryStore.set(botKey, filtered);
                scheduleSave();
            }
            return false;
        }

        if (mType === 'reactionMessage' || mType === 'senderKeyDistributionMessage') {
            return false;
        }

        let kind = '';
        let text = '';
        let mediaNode = null;
        let mimetype = '';

        if (mType === 'imageMessage') {
            kind = 'image';
            mediaNode = unwrapped.imageMessage;
            text = mediaNode?.caption || '';
            mimetype = mediaNode?.mimetype || 'image/jpeg';
        } else if (mType === 'videoMessage') {
            kind = 'video';
            mediaNode = unwrapped.videoMessage;
            text = mediaNode?.caption || '';
            mimetype = mediaNode?.mimetype || 'video/mp4';
        } else if (mType === 'audioMessage') {
            kind = 'audio';
            mediaNode = unwrapped.audioMessage;
            mimetype = mediaNode?.mimetype || 'audio/ogg; codecs=opus';
        } else if (mType === 'extendedTextMessage') {
            kind = 'text';
            text = unwrapped.extendedTextMessage?.text || '';
        } else if (mType === 'conversation') {
            kind = 'text';
            text = String(unwrapped.conversation || '');
        } else {
            return false;
        }

        const { phone, lid, name } = resolveStatusSender(msg, store);
        if (!phone && !lid) return false;

        const now = Date.now();
        const rawTs = typeof msg.messageTimestamp === 'number'
            ? msg.messageTimestamp
            : (msg.messageTimestamp?.low || Math.floor(now / 1000));
        const timestampMs = rawTs > 1e12 ? rawTs : rawTs * 1000;

        const entry = {
            id: msg.key?.id || `sw_${now}_${Math.random().toString(36).slice(2, 7)}`,
            phone,
            lid,
            name,
            kind,
            text,
            mimetype,
            timestampMs,
            capturedAt: now,
            mediaNode: mediaNode ? {
                url: mediaNode.url,
                directPath: mediaNode.directPath,
                mediaKey: mediaNode.mediaKey ? Buffer.from(mediaNode.mediaKey) : undefined,
                fileEncSha256: mediaNode.fileEncSha256 ? Buffer.from(mediaNode.fileEncSha256) : undefined,
                fileSha256: mediaNode.fileSha256 ? Buffer.from(mediaNode.fileSha256) : undefined,
                fileLength: mediaNode.fileLength,
                mimetype: mediaNode.mimetype,
                ptt: Boolean(mediaNode.ptt),
                gifPlayback: Boolean(mediaNode.gifPlayback)
            } : null
        };

        let list = (memoryStore.get(botKey) || []).filter((e) => e && (now - Number(e.capturedAt || 0)) < TTL_MS);
        if (list.some((e) => e.id === entry.id)) return false;
        list.push(entry);

        // Batasi per pengirim agar tidak membengkak
        const senderKey = entry.phone || entry.lid;
        const sameSender = list.filter((e) => (e.phone || e.lid) === senderKey);
        if (sameSender.length > MAX_PER_SENDER) {
            const dropIds = new Set(sameSender.slice(0, sameSender.length - MAX_PER_SENDER).map((e) => e.id));
            list = list.filter((e) => !dropIds.has(e.id));
        }
        if (list.length > MAX_TOTAL_ENTRIES) {
            list = list.slice(-MAX_TOTAL_ENTRIES);
        }

        memoryStore.set(botKey, list);
        scheduleSave();
        return true;
    } catch (_) {
        return false;
    }
}

function getFreshList(Dinz) {
    loadFromDisk();
    const botKey = getBotKey(Dinz);
    const now = Date.now();
    const list = (memoryStore.get(botKey) || []).filter((e) => e && (now - Number(e.capturedAt || 0)) < TTL_MS);
    memoryStore.set(botKey, list);
    return list;
}

function getStatusesByNumber(Dinz, rawTarget) {
    const targetPhone = normalizeDigits(rawTarget);
    if (!targetPhone) return [];
    const targetLid = global.phoneToLidMap?.[targetPhone] ? String(global.phoneToLidMap[targetPhone]) : '';
    const list = getFreshList(Dinz);

    return list.filter((e) => {
        const ePhone = e.phone || (e.lid && global.lidMap?.[e.lid] ? normalizeDigits(global.lidMap[e.lid]) : '');
        if (ePhone && ePhone === targetPhone) return true;
        if (targetLid && e.lid && e.lid === targetLid) return true;
        if (e.lid && e.lid === targetPhone) return true;
        return false;
    }).sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));
}

function listAvailableSenders(Dinz) {
    const list = getFreshList(Dinz);
    const bySender = new Map();

    for (const e of list) {
        const resolvedPhone = e.phone || (e.lid && global.lidMap?.[e.lid] ? normalizeDigits(global.lidMap[e.lid]) : '');
        const key = resolvedPhone || e.lid;
        if (!key) continue;
        if (!bySender.has(key)) {
            bySender.set(key, {
                phone: resolvedPhone,
                lid: e.lid,
                name: e.name || resolvedPhone || e.lid,
                counts: { image: 0, video: 0, audio: 0, text: 0 },
                total: 0,
                lastTs: 0
            });
        }
        const row = bySender.get(key);
        if (e.name && e.name !== key && row.name === key) row.name = e.name;
        if (row.counts[e.kind] !== undefined) row.counts[e.kind]++;
        row.total++;
        if ((e.timestampMs || 0) > row.lastTs) row.lastTs = e.timestampMs || 0;
    }

    return [...bySender.values()].sort((a, b) => b.lastTs - a.lastTs);
}

async function downloadStatusMedia(entry) {
    if (!entry || !entry.mediaNode || entry.kind === 'text') return null;
    const node = {
        ...entry.mediaNode,
        mediaKey: entry.mediaNode.mediaKey ? Buffer.from(entry.mediaNode.mediaKey) : undefined,
        fileEncSha256: entry.mediaNode.fileEncSha256 ? Buffer.from(entry.mediaNode.fileEncSha256) : undefined,
        fileSha256: entry.mediaNode.fileSha256 ? Buffer.from(entry.mediaNode.fileSha256) : undefined
    };
    const stream = await downloadContentFromMessage(node, entry.kind);
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = {
    captureStatus,
    getStatusesByNumber,
    listAvailableSenders,
    downloadStatusMedia,
    normalizeDigits
};
