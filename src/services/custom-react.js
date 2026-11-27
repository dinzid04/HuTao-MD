const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const botCtx = require('../core/context');

const STICKER_DIR = path.join(process.cwd(), 'data', 'custom-react-stickers');
const MAX_REACT_COUNT = 5;

function ensureStickerDir() {
    if (!fs.existsSync(STICKER_DIR)) {
        fs.mkdirSync(STICKER_DIR, { recursive: true });
    }
}

function toBase64IfBuf(val) {
    if (!val) return undefined;
    if (Buffer.isBuffer(val) || val instanceof Uint8Array) return Buffer.from(val).toString('base64');
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && Array.isArray(val.data)) return Buffer.from(val.data).toString('base64');
    return undefined;
}

function extractStickerPayload(rawMsg) {
    if (!rawMsg || typeof rawMsg !== 'object') return null;
    const s = rawMsg.stickerMessage || rawMsg;
    if (!s || (!s.url && !s.directPath)) return null;
    const out = {
        url: s.url,
        fileSha256: toBase64IfBuf(s.fileSha256),
        fileEncSha256: toBase64IfBuf(s.fileEncSha256),
        mediaKey: toBase64IfBuf(s.mediaKey),
        mimetype: s.mimetype || 'image/webp',
        directPath: s.directPath
    };
    if (s.isLottie) out.isLottie = true;
    if (s.isAnimated) out.isAnimated = true;
    return out;
}

function normalizeCmdKey(raw) {
    const clean = String(raw || '').trim().toLowerCase().replace(/^[.!#/$?]+/, '');
    if (!clean) return '';
    if (clean === '*' || clean === 'semua' || clean === 'global') return 'all';
    return clean;
}

function getConfig(Dinz) {
    const raw = botCtx.getSection('custom_react', Dinz);
    if (!raw || typeof raw !== 'object') {
        return { enabled: false, stickers: {}, rules: {} };
    }
    return {
        enabled: raw.enabled === true,
        stickers: raw.stickers && typeof raw.stickers === 'object' ? raw.stickers : {},
        rules: raw.rules && typeof raw.rules === 'object' ? raw.rules : {}
    };
}

function saveConfig(Dinz, cfg) {
    const clean = {
        enabled: cfg?.enabled === true,
        stickers: cfg?.stickers && typeof cfg.stickers === 'object' ? cfg.stickers : {},
        rules: cfg?.rules && typeof cfg.rules === 'object' ? cfg.rules : {}
    };
    botCtx.setSection('custom_react', clean, Dinz);
    return clean;
}

function saveLocalStickerBuffer(keyName, buf) {
    if (!Buffer.isBuffer(buf) || !buf.length) return '';
    ensureStickerDir();
    const safe = String(keyName || `st_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
    const fileName = `${safe}_${Date.now()}.webp`;
    const rel = path.join('data', 'custom-react-stickers', fileName);
    fs.writeFileSync(path.join(process.cwd(), rel), buf);
    return rel;
}

async function captureStickerFromContext(ctx, labelHint = 'react') {
    const { Dinz, m, quoted, mime, qmsg } = ctx;
    const rawSticker =
        m.quoted?.msg?.stickerMessage ||
        (m.quoted?.type === 'stickerMessage' ? m.quoted.msg : null) ||
        quoted?.stickerMessage ||
        (m.type === 'stickerMessage' ? m.msg : null);

    let payload = extractStickerPayload(rawSticker);
    let localFile = '';

    // Download buffer untuk backup lokal (dan konversi otomatis jika reply gambar/video)
    const isSticker = Boolean(rawSticker) || /webp|sticker/i.test(mime || '');
    const isImage = /image\/(?!webp)/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
    const isVideo = /video/i.test(mime || '') || m.quoted?.type === 'videoMessage' || m.type === 'videoMessage';

    if (!isSticker && !isImage && !isVideo) return null;

    let rawBuf = null;
    try {
        if (typeof qmsg?.download === 'function') rawBuf = await qmsg.download();
        else if (typeof quoted?.download === 'function') rawBuf = await quoted.download();
        else if (typeof m?.download === 'function') rawBuf = await m.download();
        else rawBuf = await Dinz.downloadMediaMessage(quoted || m);
    } catch (_) {}

    let webpBuf = isSticker ? rawBuf : null;

    if (!webpBuf && rawBuf && rawBuf.length) {
        try {
            const exif = require('../utils/exif');
            const identity = botCtx.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
            const meta = { packname: identity.packname || global.packname || 'HuTao - MD', author: identity.namaOwner || global.namaOwner || 'DinzID' };
            if (isImage && typeof exif.writeExifImg === 'function') {
                const tmpPath = await exif.writeExifImg(rawBuf, meta);
                if (tmpPath && fs.existsSync(tmpPath)) {
                    webpBuf = fs.readFileSync(tmpPath);
                    try { fs.unlinkSync(tmpPath); } catch (_) {}
                }
            } else if (isVideo && typeof exif.writeExifVid === 'function') {
                const tmpPath = await exif.writeExifVid(rawBuf, meta);
                if (tmpPath && fs.existsSync(tmpPath)) {
                    webpBuf = fs.readFileSync(tmpPath);
                    try { fs.unlinkSync(tmpPath); } catch (_) {}
                }
            }
        } catch (_) {}
    }

    if (webpBuf && webpBuf.length) {
        localFile = saveLocalStickerBuffer(labelHint, webpBuf);
        if (!payload && typeof prepareWAMessageMedia === 'function' && Dinz.waUploadToServer) {
            try {
                const uploaded = await prepareWAMessageMedia({ sticker: webpBuf }, { upload: Dinz.waUploadToServer });
                payload = extractStickerPayload(uploaded);
            } catch (_) {}
        }
    }

    if (!payload && !localFile) return null;
    return {
        payload: payload || null,
        file: localFile,
        isAnimated: Boolean(payload?.isAnimated || isVideo),
        isLottie: Boolean(payload?.isLottie)
    };
}

async function resolveStickerPayloadForSend(Dinz, item) {
    if (item.payload && (item.payload.url || item.payload.directPath)) {
        return item.payload;
    }
    if (item.file) {
        const abs = path.isAbsolute(item.file) ? item.file : path.join(process.cwd(), item.file);
        if (fs.existsSync(abs) && typeof prepareWAMessageMedia === 'function' && Dinz.waUploadToServer) {
            const buf = fs.readFileSync(abs);
            const uploaded = await prepareWAMessageMedia({ sticker: buf }, { upload: Dinz.waUploadToServer });
            const p = extractStickerPayload(uploaded);
            if (p) {
                item.payload = p;
                return p;
            }
        }
    }
    return null;
}

async function sendOneReaction(Dinz, m, item) {
    if (!item) return false;
    if (item.type === 'emoji' && item.emoji) {
        await Dinz.sendMessage(m.chat, { react: { text: item.emoji, key: m.key } });
        return true;
    }
    if (item.type === 'sticker') {
        const sendPayload = async (payload) => {
            await Dinz.relayMessage(
                m.chat,
                {
                    messageContextInfo: {
                        messageAssociation: {
                            associationType: 11,
                            parentMessageKey: m.key
                        }
                    },
                    stickerMessage: payload
                },
                {}
            );
        };

        let payload = await resolveStickerPayloadForSend(Dinz, item);
        if (!payload) return false;
        try {
            await sendPayload(payload);
            return true;
        } catch (_) {
            // Re-upload otomatis dari file .webp lokal jika CDN WA lama kedaluwarsa
            if (item.file) {
                const abs = path.isAbsolute(item.file) ? item.file : path.join(process.cwd(), item.file);
                if (fs.existsSync(abs) && typeof prepareWAMessageMedia === 'function' && Dinz.waUploadToServer) {
                    const buf = fs.readFileSync(abs);
                    const uploaded = await prepareWAMessageMedia({ sticker: buf }, { upload: Dinz.waUploadToServer });
                    const refreshed = extractStickerPayload(uploaded);
                    if (refreshed) {
                        item.payload = refreshed;
                        await sendPayload(refreshed);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function getMatchingRule(Dinz, command) {
    const cfg = getConfig(Dinz);
    if (!cfg.enabled) return null;
    const key = normalizeCmdKey(command);
    if (!key) return null;
    // Jangan ganggu command pengaturan customreact sendiri jika rule 'all' aktif
    const exact = cfg.rules[key];
    if (exact && Array.isArray(exact.items) && exact.items.length > 0) {
        return { key, rule: exact, cfg };
    }
    const wildcard = cfg.rules.all;
    if (wildcard && Array.isArray(wildcard.items) && wildcard.items.length > 0) {
        return { key: 'all', rule: wildcard, cfg };
    }
    return null;
}

function hasCustomReactFor(Dinz, command) {
    return Boolean(getMatchingRule(Dinz, command));
}

function triggerCustomReact(Dinz, m, command) {
    const match = getMatchingRule(Dinz, command);
    if (!match) return false;
    const { rule } = match;
    const items = rule.items || [];
    if (!items.length) return false;
    const count = Math.max(1, Math.min(MAX_REACT_COUNT, parseInt(rule.count, 10) || items.length));

    // Fire-and-forget agar 0ms delay pada eksekusi command utama
    (async () => {
        for (let i = 0; i < count; i++) {
            const item = items[i % items.length];
            try {
                await sendOneReaction(Dinz, m, item);
            } catch (_) {}
            if (i + 1 < count) {
                await new Promise((r) => setTimeout(r, 380));
            }
        }
    })().catch(() => {});

    return true;
}

module.exports = {
    MAX_REACT_COUNT,
    normalizeCmdKey,
    extractStickerPayload,
    getConfig,
    saveConfig,
    captureStickerFromContext,
    hasCustomReactFor,
    triggerCustomReact
};
