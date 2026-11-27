const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys');

const CACHE_PATH = path.join(process.cwd(), 'data', 'viewonce-cache.json');
const META_TTL_MS = 72 * 60 * 60 * 1000; // 72 jam
const META_CAP = 300;
const BUF_TTL_MS = 60 * 60 * 1000; // 1 jam buffer terdekripsi di RAM (untuk buka 2x/3x instan)
const BUF_CAP = 40;

const VO_BY_ID = (global._VO_STORE_BY_ID = global._VO_STORE_BY_ID || new Map());
const VO_BY_SHA = (global._VO_STORE_BY_SHA = global._VO_STORE_BY_SHA || new Map());
const VO_RAW_MSG = (global._VO_STORE_RAW_MSG = global._VO_STORE_RAW_MSG || new Map());
const VO_DECRYPTED_BUF = (global._VO_STORE_DECRYPTED = global._VO_STORE_DECRYPTED || new Map());

let loaded = false;
let saveTimer = null;

const WRAPPER_KEYS = [
    'deviceSentMessage',
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'spoilerMessage',
    'documentWithCaptionMessage',
    'editedMessage',
    'groupStatusMessage',
    'groupStatusMessageV2',
    'associatedChildMessage'
];

const MEDIA_KEYS = [
    'imageMessage',
    'videoMessage',
    'ptvMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage'
];

function toBuf(val) {
    if (!val) return null;
    if (Buffer.isBuffer(val)) return val;
    if (val instanceof Uint8Array) return Buffer.from(val);
    if (typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) {
        return Buffer.from(val.data);
    }
    if (typeof val === 'string' && val.length > 0) {
        try { return Buffer.from(val, 'base64'); } catch (_) { return null; }
    }
    return null;
}

function toNum(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'number') return val;
    if (typeof val === 'object') {
        if (typeof val.toNumber === 'function') return val.toNumber();
        if (typeof val.low === 'number') return val.low;
    }
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Unwrap berlapis semua container WA (termasuk WA Business: ephemeral -> viewOnceV2 -> imageMessage,
 * viewOnceV2Extension -> audioMessage, spoilerMessage, ptvMessage, dll) tanpa pernah salah ambil messageContextInfo.
 */
function deepExtractMedia(rawMessage, depth = 0) {
    if (!rawMessage || typeof rawMessage !== 'object' || depth > 8) return null;

    let isViewOnceOrSpoiler = false;
    let wrapperType = '';
    let cur = rawMessage;

    for (let i = 0; i < 8 && cur && typeof cur === 'object'; i++) {
        // Cek langsung apakah ada media key di level ini
        for (const mk of MEDIA_KEYS) {
            const node = cur[mk];
            if (node && typeof node === 'object') {
                const flaggedVo = Boolean(node.viewOnce || node.contextInfo?.isSpoiler);
                return {
                    mediaKeyName: mk,
                    mediaType: mk === 'ptvMessage' ? 'video' : mk.replace('Message', '').toLowerCase(),
                    node,
                    isViewOnceOrSpoiler: isViewOnceOrSpoiler || flaggedVo,
                    wrapperType: wrapperType || (flaggedVo ? (node.contextInfo?.isSpoiler ? 'spoiler' : 'viewOnce') : 'media'),
                    caption: node.caption || '',
                    mimetype: node.mimetype || '',
                    ptt: Boolean(node.ptt),
                    fileName: node.fileName || ''
                };
            }
        }
        // Cek teks spoiler
        if (isViewOnceOrSpoiler && (cur.extendedTextMessage?.text || typeof cur.conversation === 'string')) {
            return {
                mediaKeyName: 'text',
                mediaType: 'text',
                node: cur.extendedTextMessage || { text: cur.conversation },
                isViewOnceOrSpoiler: true,
                wrapperType: wrapperType || 'spoiler',
                caption: cur.extendedTextMessage?.text || cur.conversation || '',
                mimetype: 'text/plain'
            };
        }

        // Lanjut unwrap container
        let unwrapped = null;
        for (const wk of WRAPPER_KEYS) {
            if (cur[wk] && typeof cur[wk] === 'object') {
                if (/viewOnce|spoiler/i.test(wk)) {
                    isViewOnceOrSpoiler = true;
                    wrapperType = wk;
                }
                if (cur[wk].message && typeof cur[wk].message === 'object') {
                    unwrapped = cur[wk].message;
                    break;
                }
            }
        }
        if (!unwrapped && cur.protocolMessage?.editedMessage) {
            unwrapped = cur.protocolMessage.editedMessage;
        }
        if (!unwrapped) break;
        cur = unwrapped;
    }

    // Fallback normalizeMessageContent
    try {
        const norm = typeof normalizeMessageContent === 'function' ? normalizeMessageContent(rawMessage) : null;
        if (norm && norm !== rawMessage) {
            for (const mk of MEDIA_KEYS) {
                if (norm[mk] && typeof norm[mk] === 'object') {
                    const node = norm[mk];
                    return {
                        mediaKeyName: mk,
                        mediaType: mk === 'ptvMessage' ? 'video' : mk.replace('Message', '').toLowerCase(),
                        node,
                        isViewOnceOrSpoiler: Boolean(isViewOnceOrSpoiler || node.viewOnce || node.contextInfo?.isSpoiler),
                        wrapperType: wrapperType || 'media',
                        caption: node.caption || '',
                        mimetype: node.mimetype || '',
                        ptt: Boolean(node.ptt),
                        fileName: node.fileName || ''
                    };
                }
            }
        }
    } catch (_) {}

    return null;
}

function serializeMediaNode(extracted, webMsg) {
    const n = extracted?.node;
    if (!n || typeof n !== 'object') return null;
    if (extracted.mediaType === 'text') {
        return {
            msgId: webMsg?.key?.id || '',
            chatJid: webMsg?.key?.remoteJid || '',
            sender: webMsg?.key?.participant || webMsg?.sender || webMsg?.key?.remoteJid || '',
            mediaKeyName: 'text',
            mediaType: 'text',
            caption: extracted.caption || '',
            mimetype: 'text/plain',
            wrapperType: extracted.wrapperType || 'spoiler',
            ts: Date.now()
        };
    }
    const mkBuf = toBuf(n.mediaKey);
    if (!mkBuf || !mkBuf.length) return null;
    if (!n.url && !n.directPath) return null;
    return {
        msgId: webMsg?.key?.id || '',
        chatJid: webMsg?.key?.remoteJid || '',
        sender: webMsg?.key?.participant || webMsg?.sender || webMsg?.key?.remoteJid || '',
        mediaKeyName: extracted.mediaKeyName,
        mediaType: extracted.mediaType,
        wrapperType: extracted.wrapperType || 'viewOnce',
        url: n.url || '',
        directPath: n.directPath || '',
        mediaKey: mkBuf.toString('base64'),
        fileSha256: toBuf(n.fileSha256)?.toString('base64') || '',
        fileEncSha256: toBuf(n.fileEncSha256)?.toString('base64') || '',
        fileLength: toNum(n.fileLength, 0),
        mimetype: n.mimetype || '',
        caption: n.caption || '',
        ptt: Boolean(n.ptt),
        seconds: toNum(n.seconds, 0),
        fileName: n.fileName || '',
        ts: Date.now()
    };
}

function deserializeMediaNode(entry) {
    if (!entry) return null;
    if (entry.mediaType === 'text') {
        return {
            mediaKeyName: 'text',
            mediaType: 'text',
            node: { text: entry.caption || '' },
            caption: entry.caption || '',
            mimetype: 'text/plain',
            wrapperType: entry.wrapperType || 'spoiler',
            sender: entry.sender || ''
        };
    }
    return {
        mediaKeyName: entry.mediaKeyName,
        mediaType: entry.mediaType,
        wrapperType: entry.wrapperType || 'viewOnce',
        caption: entry.caption || '',
        mimetype: entry.mimetype || '',
        ptt: Boolean(entry.ptt),
        fileName: entry.fileName || '',
        sender: entry.sender || '',
        node: {
            url: entry.url || (entry.directPath ? `https://mmg.whatsapp.net${entry.directPath}` : ''),
            directPath: entry.directPath || '',
            mediaKey: entry.mediaKey ? Buffer.from(entry.mediaKey, 'base64') : undefined,
            fileSha256: entry.fileSha256 ? Buffer.from(entry.fileSha256, 'base64') : undefined,
            fileEncSha256: entry.fileEncSha256 ? Buffer.from(entry.fileEncSha256, 'base64') : undefined,
            fileLength: entry.fileLength || 0,
            mimetype: entry.mimetype || '',
            caption: entry.caption || '',
            ptt: Boolean(entry.ptt),
            seconds: entry.seconds || 0,
            fileName: entry.fileName || ''
        }
    };
}

function loadCacheOnce() {
    if (loaded) return;
    loaded = true;
    try {
        if (!fs.existsSync(CACHE_PATH)) return;
        const arr = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
        const now = Date.now();
        if (Array.isArray(arr)) {
            for (const entry of arr) {
                if (!entry || (now - (entry.ts || 0)) > META_TTL_MS) continue;
                if (entry.msgId) VO_BY_ID.set(entry.msgId, entry);
                if (entry.fileSha256) VO_BY_SHA.set(entry.fileSha256, entry);
            }
        }
    } catch (_) {}
}

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            const now = Date.now();
            const out = [];
            for (const [k, v] of VO_BY_ID.entries()) {
                if ((now - (v.ts || 0)) > META_TTL_MS) {
                    VO_BY_ID.delete(k);
                    continue;
                }
                out.push(v);
            }
            const trimmed = out.slice(-META_CAP);
            fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
            fs.promises.writeFile(CACHE_PATH, JSON.stringify(trimmed), 'utf8').catch(() => {});
        } catch (_) {}
    }, 2500);
    if (typeof saveTimer.unref === 'function') saveTimer.unref();
}

/**
 * Dipanggil otomatis untuk setiap pesan masuk/keluar agar ViewOnce / V2 / V2Ext / Spoiler
 * dari WA Business maupun WA biasa langsung tersimpan sebelum di-strip saat reply atau dibuka 2x.
 */
function recordViewOnceMessage(webMsg) {
    try {
        if (!webMsg || !webMsg.message) return false;
        const extracted = deepExtractMedia(webMsg.message);
        if (!extracted || !extracted.isViewOnceOrSpoiler) return false;
        loadCacheOnce();

        const serialized = serializeMediaNode(extracted, webMsg);
        if (!serialized) return false;

        if (serialized.msgId) {
            VO_BY_ID.set(serialized.msgId, serialized);
            if (VO_BY_ID.size > META_CAP) {
                VO_BY_ID.delete(VO_BY_ID.keys().next().value);
            }
            // Simpan raw WebMessageInfo di RAM agar bisa dipanggil updateMediaMessage jika link CDN expired
            VO_RAW_MSG.set(serialized.msgId, { key: webMsg.key, message: webMsg.message, ts: Date.now() });
            if (VO_RAW_MSG.size > 120) {
                VO_RAW_MSG.delete(VO_RAW_MSG.keys().next().value);
            }
        }
        if (serialized.fileSha256) {
            VO_BY_SHA.set(serialized.fileSha256, serialized);
            if (VO_BY_SHA.size > META_CAP) {
                VO_BY_SHA.delete(VO_BY_SHA.keys().next().value);
            }
        }
        scheduleSave();
        return true;
    } catch (_) {
        return false;
    }
}

async function streamToBuf(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

function normalizeDownloadableNode(node) {
    if (!node || typeof node !== 'object') return null;
    const mk = toBuf(node.mediaKey);
    const directPath = node.directPath || '';
    const url = node.url || (directPath ? `https://mmg.whatsapp.net${directPath}` : '');
    if (!mk || !mk.length || (!url && !directPath)) return null;
    return {
        ...node,
        url,
        directPath,
        mediaKey: mk,
        fileSha256: toBuf(node.fileSha256) || node.fileSha256,
        fileEncSha256: toBuf(node.fileEncSha256) || node.fileEncSha256
    };
}

async function tryDownloadMedia(Dinz, candidate, rawWebMsg = null, quotedObj = null) {
    if (candidate.mediaType === 'text') {
        return { buffer: null, isText: true };
    }

    const dlType = candidate.mediaType === 'ptv' ? 'video' : (candidate.mediaType || 'image');
    const cleanNode = normalizeDownloadableNode(candidate.node);

    // Metode 1: downloadContentFromMessage langsung dengan URL asli
    if (cleanNode) {
        try {
            const stream = await downloadContentFromMessage(cleanNode, dlType);
            const buf = await streamToBuf(stream);
            if (buf && buf.length > 0) return { buffer: buf, method: 'direct' };
        } catch (_) {}

        // Metode 2: paksa rekonstruksi URL CDN dari directPath (sering menyelamatkan media WA Business)
        if (cleanNode.directPath) {
            try {
                const reconstructed = {
                    ...cleanNode,
                    url: `https://mmg.whatsapp.net${cleanNode.directPath.startsWith('/') ? '' : '/'}${cleanNode.directPath}`
                };
                const stream = await downloadContentFromMessage(reconstructed, dlType);
                const buf = await streamToBuf(stream);
                if (buf && buf.length > 0) return { buffer: buf, method: 'directPath-reconstruct' };
            } catch (_) {}
        }
    }

    // Metode 3: minta WhatsApp re-upload media jika link CDN 404/410 expired (updateMediaMessage)
    if (rawWebMsg && Dinz && typeof Dinz.updateMediaMessage === 'function') {
        try {
            const refreshed = await Dinz.updateMediaMessage(rawWebMsg);
            const refreshedExt = deepExtractMedia(refreshed?.message || rawWebMsg.message);
            const refreshedNode = normalizeDownloadableNode(refreshedExt?.node);
            if (refreshedNode) {
                const stream = await downloadContentFromMessage(refreshedNode, dlType);
                const buf = await streamToBuf(stream);
                if (buf && buf.length > 0) return { buffer: buf, method: 'media-reupload' };
            }
        } catch (_) {}
    }

    // Metode 4: fallback download() bawaan serializer quoted
    if (quotedObj && typeof quotedObj.download === 'function') {
        try {
            const buf = await quotedObj.download();
            if (Buffer.isBuffer(buf) && buf.length > 0) return { buffer: buf, method: 'quoted-download' };
        } catch (_) {}
    }

    // Metode 5: fallback Dinz.downloadMediaMessage
    if (Dinz && typeof Dinz.downloadMediaMessage === 'function') {
        for (const target of [rawWebMsg, quotedObj].filter(Boolean)) {
            try {
                const buf = await Dinz.downloadMediaMessage(target, 'buffer');
                if (Buffer.isBuffer(buf) && buf.length > 0) return { buffer: buf, method: 'sock-download' };
            } catch (_) {}
        }
    }

    return null;
}

/**
 * Auto-fallback multi-lapis untuk RVO:
 * Layer 0: RAM Decrypted Buffer Cache (instan untuk buka ke-2, ke-3, dst!)
 * Layer 1: Deep unwrap langsung dari m.quoted.message
 * Layer 2: Persistent viewonce-cache (berdasarkan quoted.id atau fileSha256 — tembus meski WA Business strip mediaKey saat reply!)
 * Layer 3: Baileys store.loadMessage(chat / altJid, quoted.id)
 * Layer 4: Multi-method downloader (direct -> directPath CDN -> updateMediaMessage reupload -> quoted.download -> downloadMediaMessage)
 */
async function extractAndDownloadViewOnce(Dinz, m, store = null) {
    loadCacheOnce();
    const quoted = m?.quoted;
    const quotedId = quoted?.id || quoted?.key?.id || '';
    const now = Date.now();

    // Layer 0: Cache buffer terdekripsi di RAM (menjamin buka 2x/3x/berkali-kali 100% tembus!)
    if (quotedId && VO_DECRYPTED_BUF.has(quotedId)) {
        const hit = VO_DECRYPTED_BUF.get(quotedId);
        if (hit && (now - hit.ts) < BUF_TTL_MS) {
            return { ...hit, fromCache: true };
        }
        VO_DECRYPTED_BUF.delete(quotedId);
    }

    const candidates = [];
    const rawMsgFromCache = quotedId ? VO_RAW_MSG.get(quotedId) : null;

    // Layer 1: Unwrap langsung dari m.quoted.message (termasuk raw contextInfo.quotedMessage)
    const rawQuotedMsg = quoted?.message || m?.msg?.contextInfo?.quotedMessage || null;
    const directExt = deepExtractMedia(rawQuotedMsg);
    if (directExt) {
        candidates.push({ ext: directExt, rawWebMsg: rawMsgFromCache || (quoted?.key ? { key: quoted.key, message: rawQuotedMsg } : null) });
    }

    // Layer 2: Lookup viewonce-store by msgId atau fileSha256
    const directSha = directExt?.node?.fileSha256 ? toBuf(directExt.node.fileSha256)?.toString('base64') : '';
    const storedEntry = (quotedId && VO_BY_ID.get(quotedId)) || (directSha && VO_BY_SHA.get(directSha)) || null;
    if (storedEntry) {
        const deser = deserializeMediaNode(storedEntry);
        if (deser) candidates.push({ ext: deser, rawWebMsg: rawMsgFromCache });
    }

    // Layer 3: Lookup Baileys in-memory store.loadMessage (plus LID/PN altJids)
    if (store && typeof store.loadMessage === 'function' && quotedId && m?.chat) {
        const jidsToTry = [m.chat];
        const digits = String(m.chat || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (digits) {
            if (global.lidMap?.[digits]) jidsToTry.push(`${global.lidMap[digits]}@s.whatsapp.net`);
            if (global.phoneToLidMap?.[digits]) jidsToTry.push(`${global.phoneToLidMap[digits]}@lid`);
        }
        for (const jidTry of [...new Set(jidsToTry)]) {
            try {
                const orig = await store.loadMessage(jidTry, quotedId);
                if (orig?.message) {
                    const fromStore = deepExtractMedia(orig.message);
                    if (fromStore) {
                        candidates.push({ ext: fromStore, rawWebMsg: orig });
                        break;
                    }
                }
            } catch (_) {}
        }
    }

    // Fallback terakhir: m.quoted.msg bila belum terdeteksi
    if (candidates.length === 0 && quoted?.msg && typeof quoted.msg === 'object') {
        const fallbackType = String(quoted.type || '').replace('Message', '').toLowerCase() || 'image';
        candidates.push({
            ext: {
                mediaKeyName: quoted.type || 'imageMessage',
                mediaType: fallbackType === 'ptv' ? 'video' : fallbackType,
                node: quoted.msg,
                caption: quoted.msg.caption || quoted.text || '',
                mimetype: quoted.msg.mimetype || '',
                ptt: Boolean(quoted.msg.ptt),
                fileName: quoted.msg.fileName || '',
                wrapperType: 'quoted'
            },
            rawWebMsg: rawMsgFromCache
        });
    }

    let lastErr = null;
    for (const c of candidates) {
        try {
            const res = await tryDownloadMedia(Dinz, c.ext, c.rawWebMsg, quoted);
            if (res && (res.isText || (Buffer.isBuffer(res.buffer) && res.buffer.length > 0))) {
                const result = {
                    buffer: res.buffer,
                    isText: Boolean(res.isText),
                    mediaType: c.ext.mediaType,
                    mediaKeyName: c.ext.mediaKeyName,
                    mimetype: c.ext.mimetype || '',
                    caption: c.ext.caption || '',
                    ptt: Boolean(c.ext.ptt),
                    fileName: c.ext.fileName || '',
                    wrapperType: c.ext.wrapperType || 'viewOnce',
                    sender: quoted?.sender || c.ext.sender || '',
                    method: res.method || 'direct',
                    ts: Date.now()
                };
                if (quotedId) {
                    VO_DECRYPTED_BUF.set(quotedId, result);
                    if (VO_DECRYPTED_BUF.size > BUF_CAP) {
                        VO_DECRYPTED_BUF.delete(VO_DECRYPTED_BUF.keys().next().value);
                    }
                }
                return result;
            }
        } catch (e) {
            lastErr = e;
        }
    }

    if (lastErr) throw lastErr;
    return null;
}

module.exports = {
    deepExtractMedia,
    recordViewOnceMessage,
    extractAndDownloadViewOnce
};
