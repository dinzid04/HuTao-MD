const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const axios = require('axios');
const baileys = require('@whiskeysockets/baileys');
const { writeExif } = require('../utils/exif');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

const STICKERLY_V4_SEARCH = 'https://api.sticker.ly/v4/stickerPack/smartSearch';
const STICKERLY_V4_PACK = 'https://api.sticker.ly/v4/stickerPack';
const STICKERLY_UA = 'androidapp.stickerly/3.17.0 (Redmi Note 8; U; Android 11; id-ID; id;)';
const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_PACK_STICKERS = 30;
const TMP_DIR = path.join(process.cwd(), 'tmp');

const sessions = (global._stikerlySessions = global._stikerlySessions || new Map());

const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZipBuffer(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuf = Buffer.from(String(entry.name), 'utf8');
        const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
        const checksum = crc32(dataBuf);
        const compressed = entry.store ? dataBuf : zlib.deflateRawSync(dataBuf, { level: 6 });
        const method = entry.store ? 0 : 8;

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(method, 8);
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(checksum, 14);
        localHeader.writeUInt32LE(compressed.length, 18);
        localHeader.writeUInt32LE(dataBuf.length, 22);
        localHeader.writeUInt16LE(nameBuf.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, nameBuf, compressed);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0, 8);
        centralHeader.writeUInt16LE(method, 10);
        centralHeader.writeUInt16LE(0, 12);
        centralHeader.writeUInt16LE(0, 14);
        centralHeader.writeUInt32LE(checksum, 16);
        centralHeader.writeUInt32LE(compressed.length, 20);
        centralHeader.writeUInt32LE(dataBuf.length, 24);
        centralHeader.writeUInt16LE(nameBuf.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);

        centralParts.push(centralHeader, nameBuf);
        offset += localHeader.length + nameBuf.length + compressed.length;
    }

    const centralBuf = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralBuf, eocd]);
}

function patchBaileysStickerPackDefaults() {
    const candidates = [
        '@whiskeysockets/baileys/lib/Defaults',
        '@whiskeysockets/baileys/lib/Defaults/index.js'
    ];
    for (const modPath of candidates) {
        try {
            const def = require(modPath);
            if (def && def.MEDIA_PATH_MAP && typeof def.MEDIA_PATH_MAP === 'object') {
                if (!def.MEDIA_PATH_MAP['sticker-pack']) {
                    def.MEDIA_PATH_MAP['sticker-pack'] = '/mms/sticker-pack';
                }
                if (!def.MEDIA_PATH_MAP['thumbnail-sticker-pack']) {
                    def.MEDIA_PATH_MAP['thumbnail-sticker-pack'] = '/mms/thumbnail-sticker-pack';
                }
            }
            if (def && def.MEDIA_HKDF_KEY_MAPPING && typeof def.MEDIA_HKDF_KEY_MAPPING === 'object') {
                if (!def.MEDIA_HKDF_KEY_MAPPING['sticker-pack']) {
                    def.MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack';
                }
                if (!def.MEDIA_HKDF_KEY_MAPPING['thumbnail-sticker-pack']) {
                    def.MEDIA_HKDF_KEY_MAPPING['thumbnail-sticker-pack'] = 'Sticker Pack';
                }
            }
            if (def && Array.isArray(def.MEDIA_KEYS)) {
                if (!def.MEDIA_KEYS.includes('sticker-pack')) def.MEDIA_KEYS.push('sticker-pack');
                if (!def.MEDIA_KEYS.includes('thumbnail-sticker-pack')) def.MEDIA_KEYS.push('thumbnail-sticker-pack');
            }
            break;
        } catch (_) {}
    }
}

function hkdfExpandMediaKey(mediaKey, infoLabel) {
    const keyBuf = Buffer.isBuffer(mediaKey) ? mediaKey : Buffer.from(mediaKey);
    const derived = Buffer.from(crypto.hkdfSync('sha256', keyBuf, Buffer.alloc(32, 0), Buffer.from(infoLabel, 'utf8'), 112));
    return {
        iv: derived.subarray(0, 16),
        cipherKey: derived.subarray(16, 48),
        macKey: derived.subarray(48, 80)
    };
}

function encryptWhatsAppMedia(plainBuf, mediaKey, hkdfInfo = 'WhatsApp Sticker Pack Keys') {
    const { iv, cipherKey, macKey } = hkdfExpandMediaKey(mediaKey, hkdfInfo);
    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    const encData = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
    const mac = crypto.createHmac('sha256', macKey).update(Buffer.concat([iv, encData])).digest().subarray(0, 10);
    const encryptedBuffer = Buffer.concat([encData, mac]);
    const fileSha256 = crypto.createHash('sha256').update(plainBuf).digest();
    const fileEncSha256 = crypto.createHash('sha256').update(encryptedBuffer).digest();
    return { encryptedBuffer, fileSha256, fileEncSha256, fileLength: plainBuf.length };
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCompactNum(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
}

function makeSessionKey(Dinz, chatId, sender) {
    const botKey = Dinz?.isJadibot && Dinz?.jadibotNumber ? Dinz.jadibotNumber : 'main';
    const cleanSender = String(sender || '').split('@')[0].split(':')[0];
    return `${botKey}_${chatId}_${cleanSender}`;
}

function saveSearchSession(Dinz, chatId, sender, query, items, lastMsgId = '') {
    const now = Date.now();
    for (const [k, v] of sessions.entries()) {
        if (now > v.expiresAt) sessions.delete(k);
    }
    const key = makeSessionKey(Dinz, chatId, sender);
    const entry = {
        query,
        items,
        lastMsgId,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS
    };
    sessions.set(key, entry);
    return entry;
}

function getSearchSession(Dinz, chatId, sender) {
    const key = makeSessionKey(Dinz, chatId, sender);
    const entry = sessions.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        sessions.delete(key);
        return null;
    }
    return entry;
}

function clearSearchSession(Dinz, chatId, sender) {
    sessions.delete(makeSessionKey(Dinz, chatId, sender));
}

async function searchStickerlyDirect(query, limit = 8) {
    const res = await axios.post(
        STICKERLY_V4_SEARCH,
        {
            keyword: query,
            enabledKeywordSearch: true,
            filter: {
                extendSearchResult: false,
                sortBy: 'RECOMMENDED',
                languages: ['ALL'],
                minStickerCount: 3,
                searchBy: 'ALL',
                stickerType: 'ALL'
            }
        },
        {
            timeout: 20000,
            headers: {
                'User-Agent': STICKERLY_UA,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            validateStatus: () => true
        }
    );
    const packs = res.data?.result?.stickerPacks;
    if (res.status !== 200 || !Array.isArray(packs) || packs.length === 0) {
        throw new Error(`Sticker.ly v4 search gagal (HTTP ${res.status})`);
    }
    return packs.slice(0, limit).map((item, idx) => {
        const prefix = String(item.resourceUrlPrefix || '');
        const files = Array.isArray(item.resourceFiles) ? item.resourceFiles : [];
        const fullUrls = prefix ? files.map((f) => `${prefix}${f}`) : [];
        const packId = String(item.packId || '').trim();
        return {
            index: idx + 1,
            name: String(item.name || `Sticker Pack #${idx + 1}`).trim(),
            author: String(item.authorName || item.user?.userName || 'Unknown').trim(),
            packId,
            shareUrl: String(item.shareUrl || (packId ? `https://sticker.ly/s/${packId}` : '')).trim(),
            isAnimated: Boolean(item.isAnimated || item.animated),
            downloads: Number(item.exportCount || item.viewCount) || 0,
            thumbnails: fullUrls.slice(0, 3),
            stickers: fullUrls
        };
    }).filter((it) => it.shareUrl);
}

async function searchStickerly(query, limit = 8) {
    const q = String(query || '').trim();
    if (!q) throw new Error('Kata kunci pencarian kosong.');
    return searchStickerlyDirect(q, limit);
}

function extractStickerlyPackId(input) {
    const s = String(input || '').trim();
    const m = s.match(/sticker\.ly\/s\/([A-Za-z0-9_-]+)/i);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{4,16}$/.test(s)) return s;
    return '';
}

function normalizeStickerlyUrl(input) {
    const id = extractStickerlyPackId(input);
    return id ? `https://sticker.ly/s/${id}` : '';
}

async function downloadStickerlyDirectApi(packId, shareUrl) {
    const res = await axios.get(`${STICKERLY_V4_PACK}/${encodeURIComponent(packId)}`, {
        timeout: 20000,
        headers: {
            'User-Agent': STICKERLY_UA,
            'Accept': 'application/json'
        },
        validateStatus: () => true
    });
    const r = res.data?.result;
    if (res.status !== 200 || !r) {
        throw new Error(`Sticker.ly v4 detail gagal (HTTP ${res.status})`);
    }
    let prefix = String(r.resourceUrlPrefix || '');
    if (!prefix && r.stickers?.[0]?.stickerPack?.trayResourceUrl) {
        const tray = String(r.stickers[0].stickerPack.trayResourceUrl);
        prefix = tray.slice(0, tray.lastIndexOf('/') + 1);
    }
    let stickerUrls = [];
    if (prefix && Array.isArray(r.stickers) && r.stickers.length > 0) {
        stickerUrls = r.stickers.map((st) => st?.fileName ? `${prefix}${st.fileName}` : '').filter(Boolean);
    } else if (prefix && Array.isArray(r.stickers?.[0]?.stickerPack?.resourceFileNames)) {
        stickerUrls = r.stickers[0].stickerPack.resourceFileNames.map((f) => `${prefix}${f}`);
    }
    stickerUrls = [...new Set(stickerUrls)];
    if (stickerUrls.length === 0) {
        throw new Error('Daftar stiker kosong dari API Sticker.ly v4.');
    }
    return {
        name: String(r.name || r.stickers?.[0]?.stickerPack?.name || 'Sticker.ly Pack').trim(),
        author: String(r.authorName || r.user?.userName || r.stickers?.[0]?.stickerPack?.authorName || 'Sticker.ly').trim(),
        packId: String(r.packId || packId).trim(),
        isAnimated: Boolean(r.isAnimated || r.animated),
        shareUrl: String(r.shareUrl || shareUrl),
        stickers: stickerUrls
    };
}

async function downloadStickerlyWebScrape(packId, shareUrl) {
    const res = await axios.get(shareUrl, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html'
        },
        validateStatus: () => true
    });
    const html = String(res.data || '');
    if (res.status !== 200 || html.length < 200) {
        throw new Error(`Halaman Sticker.ly gagal dimuat (HTTP ${res.status})`);
    }
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const name = titleMatch ? titleMatch[1].replace(/\s*[-|]\s*Sticker\.ly.*$/i, '').trim() : `Pack ${packId}`;
    const re = new RegExp(`https?:\\/\\/stickerly\\.pstatic\\.net\\/sticker_pack\\/[^"'<>\\s&]+\\/${packId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/[^"'<>\\s&]+\\.(?:webp|png)`, 'gi');
    const matches = [...new Set((html.match(re) || []).map((u) => u.replace(/&#39;.*$/, '')))];
    const webpOnly = matches.filter((u) => u.endsWith('.webp'));
    const pngOnly = matches.filter((u) => u.endsWith('.png'));
    const stickers = webpOnly.length >= pngOnly.length && webpOnly.length > 0 ? webpOnly : pngOnly;
    if (stickers.length === 0) {
        throw new Error('Tidak ditemukan file stiker di halaman Sticker.ly.');
    }
    return {
        name,
        author: 'Sticker.ly',
        packId,
        isAnimated: stickers.every((u) => u.endsWith('.webp')),
        shareUrl,
        stickers
    };
}

async function downloadStickerly(urlOrCode) {
    const packId = extractStickerlyPackId(urlOrCode);
    const shareUrl = normalizeStickerlyUrl(urlOrCode);
    if (!packId || !shareUrl) throw new Error('URL atau kode pack Sticker.ly tidak valid.');

    try {
        return await downloadStickerlyDirectApi(packId, shareUrl);
    } catch (_) {}

    return downloadStickerlyWebScrape(packId, shareUrl);
}

async function mapConcurrent(list, concurrency, fn) {
    const results = new Array(list.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
        while (cursor < list.length) {
            const idx = cursor++;
            try {
                results[idx] = await fn(list[idx], idx);
            } catch (_) {
                results[idx] = null;
            }
        }
    });
    await Promise.all(workers);
    return results;
}

async function fetchInlineThumbDataUri(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: () => true
    });
    if (res.status !== 200 || !res.data || res.data.length < 50) return null;
    const raw = Buffer.from(res.data);
    if (sharp) {
        try {
            const tiny = await sharp(raw, { animated: false })
                .resize(84, 84, { fit: 'contain', background: { r: 22, g: 30, b: 46, alpha: 0 } })
                .webp({ quality: 65 })
                .toBuffer();
            if (Buffer.isBuffer(tiny) && tiny.length > 0) {
                return `data:image/webp;base64,${tiny.toString('base64')}`;
            }
        } catch (_) {}
    }
    const ct = String(res.headers?.['content-type'] || 'image/png').split(';')[0];
    if (raw.length <= 40000) {
        return `data:${ct};base64,${raw.toString('base64')}`;
    }
    return url;
}

async function buildStickerlyPreviewHtml({ query, items, usedPrefix = '.', botname = 'HuTao - MD' }) {
    const thumbJobs = [];
    for (let i = 0; i < items.length; i++) {
        const thumbs = items[i].thumbnails.slice(0, 3);
        for (let j = 0; j < thumbs.length; j++) {
            thumbJobs.push({ i, j, url: thumbs[j] });
        }
    }

    const resolved = await mapConcurrent(thumbJobs, 8, (job) => fetchInlineThumbDataUri(job.url));
    const thumbMap = items.map(() => []);
    for (let k = 0; k < thumbJobs.length; k++) {
        const { i, url } = thumbJobs[k];
        thumbMap[i].push(resolved[k] || url);
    }

    const cardsHtml = items.map((item, idx) => {
        const badgeClass = item.isAnimated ? 'badge anim' : 'badge stat';
        const badgeText = item.isAnimated ? 'ANIMATED' : 'STATIC';
        const imgs = (thumbMap[idx].length ? thumbMap[idx] : item.thumbnails.slice(0, 3))
            .map((src) => `<div class="thumb"><img src="${escapeHtml(src)}" alt="s" loading="lazy"/></div>`)
            .join('');
        return `
        <div class="card">
            <div class="card-top">
                <div class="num">#${item.index}</div>
                <div class="meta">
                    <div class="title">${escapeHtml(item.name)}</div>
                    <div class="sub">@${escapeHtml(item.author)} • ${formatCompactNum(item.downloads)} DL</div>
                </div>
                <span class="${badgeClass}">${badgeText}</span>
            </div>
            <div class="thumbs">${imgs || '<div class="thumb empty">✨</div>'}</div>
            <div class="card-foot">
                <span class="code">ID: ${escapeHtml(item.packId || '-')}</span>
                <span class="cmd">Ketik <b>${item.index}</b> atau <b>${escapeHtml(usedPrefix)}stikerlydl ${item.index}</b></span>
            </div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sticker.ly Preview</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(160deg,#0b1120 0%,#111c34 100%);color:#f1f5f9;padding:14px;min-height:100vh}
.hdr{background:rgba(30,41,59,.88);border:1px solid rgba(56,189,248,.35);border-radius:16px;padding:14px 16px;margin-bottom:12px}
.hdr-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.brand{font-size:12px;font-weight:800;letter-spacing:.8px;color:#38bdf8;text-transform:uppercase}
.cnt{font-size:11px;background:rgba(56,189,248,.16);color:#7dd3fc;padding:3px 9px;border-radius:99px;font-weight:700}
.q{font-size:18px;font-weight:800;margin-top:4px;color:#fff}
.hint{font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.45}
.hint b{color:#34d399}
.grid{display:grid;grid-template-columns:1fr;gap:10px}
.card{background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:11px 12px}
.card-top{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.num{min-width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
.meta{flex:1;min-width:0}
.title{font-size:14px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{font-size:11px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{font-size:10px;font-weight:800;padding:3px 7px;border-radius:7px;letter-spacing:.4px}
.badge.anim{background:rgba(244,114,182,.18);color:#f472b6;border:1px solid rgba(244,114,182,.35)}
.badge.stat{background:rgba(52,211,153,.16);color:#34d399;border:1px solid rgba(52,211,153,.3)}
.thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:9px}
.thumb{background:rgba(30,41,59,.85);border:1px solid rgba(148,163,184,.14);border-radius:10px;height:78px;display:flex;align-items:center;justify-content:center;padding:5px;overflow:hidden}
.thumb img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}
.thumb.empty{font-size:22px}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;padding-top:7px;border-top:1px dashed rgba(148,163,184,.18);font-size:11px;color:#94a3b8}
.code{font-family:monospace;color:#cbd5e1}
.cmd b{color:#38bdf8}
.ftr{text-align:center;font-size:11px;color:#64748b;margin-top:12px}
</style>
</head>
<body>
<div class="hdr">
    <div class="hdr-row">
        <span class="brand">Sticker.ly Rich Preview</span>
        <span class="cnt">${items.length} Pack</span>
    </div>
    <div class="q">🔎 ${escapeHtml(query)}</div>
    <div class="hint">Pilih nomor di bawah lalu ketik langsung angkanya (contoh: <b>1</b>) atau <b>${escapeHtml(usedPrefix)}stikerlydl 1</b> untuk download lengkap jadi <b>Sticker Pack WA</b>.</div>
</div>
<div class="grid">${cardsHtml}</div>
<div class="ftr">© ${escapeHtml(botname)} • Sticker Pack Downloader</div>
</body>
</html>`;
}

function isAnimatedWebpBuffer(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 30) return false;
    return buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP' &&
        (buf.includes(Buffer.from('ANIM')) || buf.includes(Buffer.from('ANMF')));
}

async function prepareStickerWebp(rawBuf, { packname, author, isAnimatedHint = false }) {
    const isAlreadyWebp = rawBuf.length > 12 &&
        rawBuf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        rawBuf.subarray(8, 12).toString('ascii') === 'WEBP';
    const animated = isAnimatedHint || isAnimatedWebpBuffer(rawBuf);

    let webpBuf = rawBuf;
    if (!isAlreadyWebp || !animated) {
        if (sharp) {
            try {
                const conv = await sharp(rawBuf, { animated: false })
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp({ quality: 80 })
                    .toBuffer();
                if (Buffer.isBuffer(conv) && conv.length > 0) webpBuf = conv;
            } catch (_) {}
        }
    }

    try {
        const res = await writeExif(webpBuf, { packname, author });
        if (typeof res === 'string' && fs.existsSync(res)) {
            const withExif = fs.readFileSync(res);
            try { fs.unlinkSync(res); } catch (_) {}
            return { buffer: withExif, isAnimated: animated };
        }
        if (Buffer.isBuffer(res)) {
            return { buffer: res, isAnimated: animated };
        }
    } catch (_) {}

    return { buffer: webpBuf, isAnimated: animated };
}

async function preparePackIcons(firstRawBuf) {
    let trayIconPng = firstRawBuf;
    let coverPng = firstRawBuf;
    if (sharp) {
        try {
            const t = await sharp(firstRawBuf, { animated: false })
                .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png({ compressionLevel: 9 })
                .toBuffer();
            if (Buffer.isBuffer(t) && t.length > 0) trayIconPng = t;
        } catch (_) {}
        try {
            const c = await sharp(firstRawBuf, { animated: false })
                .resize(252, 252, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png({ compressionLevel: 8 })
                .toBuffer();
            if (Buffer.isBuffer(c) && c.length > 0) coverPng = c;
        } catch (_) {}
    }
    return { trayIconPng, coverPng };
}

async function uploadEncryptedBuffer(Dinz, encBuf, fileEncSha256, mediaType) {
    const buf = Buffer.isBuffer(encBuf) ? encBuf : Buffer.from(encBuf);
    const opts = {
        mediaType,
        fileEncSha256B64: fileEncSha256.toString('base64')
    };

    try {
        return await Dinz.waUploadToServer(buf, opts);
    } catch (bufErr) {
        // Fallback jika fork Baileys tertentu mengharapkan file path string bukan Buffer/Stream
        const msg = String(bufErr?.message || '');
        if (/ENOENT|path|string|fs\.createReadStream/i.test(msg)) {
            if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
            const tmpPath = path.join(TMP_DIR, `spack_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.enc`);
            fs.writeFileSync(tmpPath, buf);
            try {
                return await Dinz.waUploadToServer(tmpPath, opts);
            } finally {
                try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
            }
        }
        throw bufErr;
    }
}

async function sendNativeStickerPack(Dinz, jid, packData, quoted, { packname, author } = {}) {
    patchBaileysStickerPackDefaults();

    const urls = (packData.stickers || []).slice(0, MAX_PACK_STICKERS);
    if (urls.length === 0) throw new Error('Daftar stiker kosong.');

    const downloaded = await mapConcurrent(urls, 6, async (url) => {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: () => true
        });
        if (res.status !== 200 || !res.data || res.data.length < 50) return null;
        return Buffer.from(res.data);
    });

    const validRaw = downloaded.filter(Boolean);
    if (validRaw.length === 0) throw new Error('Gagal mengunduh file stiker dari Sticker.ly.');

    const finalPackName = String(packData.name || packname || global.packname || 'Sticker Pack').slice(0, 64);
    const finalPublisher = String(packData.author || author || global.namaOwner || 'DinzID').slice(0, 64);

    const prepared = await mapConcurrent(validRaw, 4, (raw) =>
        prepareStickerWebp(raw, {
            packname: finalPackName,
            author: finalPublisher,
            isAnimatedHint: packData.isAnimated
        })
    );
    const validStickers = prepared.filter((s) => s && Buffer.isBuffer(s.buffer) && s.buffer.length > 0);
    if (validStickers.length === 0) throw new Error('Gagal memproses file WebP stiker.');

    const stickerPackId = crypto.randomUUID();
    const trayIconFileName = `${stickerPackId}.png`;
    const { trayIconPng, coverPng } = await preparePackIcons(validRaw[0]);

    const zipEntries = [{ name: trayIconFileName, data: trayIconPng, store: false }];
    const protoStickers = [];
    let uncompressedSize = trayIconPng.length;

    for (let i = 0; i < validStickers.length; i++) {
        const st = validStickers[i];
        const hashName = crypto.createHash('sha256').update(st.buffer).digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        const fileName = `${hashName}_${i}.webp`;
        zipEntries.push({ name: fileName, data: st.buffer, store: false });
        uncompressedSize += st.buffer.length;
        protoStickers.push({
            fileName,
            isAnimated: Boolean(st.isAnimated),
            emojis: ['✨'],
            accessibilityLabel: finalPackName,
            isLottie: false,
            mimetype: 'image/webp'
        });
    }

    const zipBuffer = buildZipBuffer(zipEntries);
    const mediaKey = crypto.randomBytes(32);
    const mediaKeyTimestamp = Math.floor(Date.now() / 1000);

    const encPack = encryptWhatsAppMedia(zipBuffer, mediaKey, 'WhatsApp Sticker Pack Keys');
    const encThumb = encryptWhatsAppMedia(coverPng, mediaKey, 'WhatsApp Sticker Pack Keys');
    const imageDataHash = crypto.createHash('sha256').update(coverPng).digest('base64');

    if (typeof Dinz.waUploadToServer !== 'function') {
        throw new Error('Socket tidak mendukung waUploadToServer untuk Sticker Pack.');
    }

    const packUpload = await uploadEncryptedBuffer(Dinz, encPack.encryptedBuffer, encPack.fileEncSha256, 'sticker-pack');
    if (!packUpload || !packUpload.directPath) {
        throw new Error('Upload paket ZIP ke server WhatsApp gagal.');
    }

    let thumbDirectPath = '';
    try {
        const thumbUpload = await uploadEncryptedBuffer(Dinz, encThumb.encryptedBuffer, encThumb.fileEncSha256, 'thumbnail-sticker-pack');
        thumbDirectPath = thumbUpload?.directPath || '';
    } catch (_) {
        try {
            const thumbFallback = await uploadEncryptedBuffer(Dinz, encThumb.encryptedBuffer, encThumb.fileEncSha256, 'image');
            thumbDirectPath = thumbFallback?.directPath || '';
        } catch (_) {}
    }

    const stickerPackMessage = {
        stickerPackId,
        name: finalPackName,
        publisher: finalPublisher,
        stickers: protoStickers,
        fileLength: encPack.fileLength,
        fileSha256: encPack.fileSha256,
        fileEncSha256: encPack.fileEncSha256,
        mediaKey,
        directPath: packUpload.directPath,
        caption: `${finalPackName} (${validStickers.length} stiker)`,
        packDescription: `Diunduh dari Sticker.ly • Author: ${finalPublisher}`,
        mediaKeyTimestamp,
        trayIconFileName,
        thumbnailDirectPath: thumbDirectPath || undefined,
        thumbnailSha256: thumbDirectPath ? encThumb.fileSha256 : undefined,
        thumbnailEncSha256: thumbDirectPath ? encThumb.fileEncSha256 : undefined,
        thumbnailHeight: 252,
        thumbnailWidth: 252,
        imageDataHash,
        stickerPackSize: uncompressedSize,
        stickerPackOrigin: 1
    };

    const rawMsgObj = { stickerPackMessage };
    let msgToRelay = rawMsgObj;
    let msgId = typeof baileys.generateMessageIDV2 === 'function'
        ? baileys.generateMessageIDV2()
        : (typeof baileys.generateMessageID === 'function' ? baileys.generateMessageID() : `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`);

    if (typeof baileys.generateWAMessageFromContent === 'function') {
        const built = baileys.generateWAMessageFromContent(jid, rawMsgObj, {
            quoted,
            messageId: msgId,
            userJid: Dinz.user?.id
        });
        if (built?.message) {
            msgToRelay = built.message;
            msgId = built.key?.id || msgId;
        }
    }

    await Dinz.relayMessage(jid, msgToRelay, {
        messageId: msgId,
        AI: false,
        additionalAttributes: { type: 'media' }
    });
    return {
        mode: 'pack',
        stickerPackId,
        name: finalPackName,
        publisher: finalPublisher,
        count: validStickers.length,
        totalAvailable: packData.stickers.length,
        zipBytes: zipBuffer.length,
        preparedStickers: validStickers
    };
}

module.exports = {
    MAX_PACK_STICKERS,
    crc32,
    buildZipBuffer,
    patchBaileysStickerPackDefaults,
    hkdfExpandMediaKey,
    encryptWhatsAppMedia,
    saveSearchSession,
    getSearchSession,
    clearSearchSession,
    searchStickerly,
    normalizeStickerlyUrl,
    downloadStickerly,
    buildStickerlyPreviewHtml,
    sendNativeStickerPack
};
