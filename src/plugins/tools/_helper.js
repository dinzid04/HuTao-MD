const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys');

async function downloadToolMediaSafely(Dinz, m, qmsg, quoted) {
    const candidates = [qmsg, m?.quoted, quoted, m];
    for (const c of candidates) {
        if (c && typeof c.download === 'function') {
            try {
                const buf = await c.download();
                if (Buffer.isBuffer(buf) && buf.length > 0) return buf;
            } catch (_) {}
        }
    }
    if (typeof Dinz?.downloadMediaMessage === 'function') {
        for (const c of [m?.quoted, quoted, m]) {
            if (!c) continue;
            try {
                const buf = await Dinz.downloadMediaMessage(c);
                if (Buffer.isBuffer(buf) && buf.length > 0) return buf;
            } catch (_) {}
        }
    }
    const rawTargets = [];
    if (m?.quoted?.message) rawTargets.push(m.quoted.message);
    if (m?.message) {
        const norm = typeof normalizeMessageContent === 'function' ? (normalizeMessageContent(m.message) || m.message) : m.message;
        for (const k of Object.keys(norm || {})) {
            if (norm[k]?.contextInfo?.quotedMessage) rawTargets.push(norm[k].contextInfo.quotedMessage);
        }
        rawTargets.push(norm);
    }
    const typeMap = [
        ['imageMessage', 'image'],
        ['videoMessage', 'video'],
        ['ptvMessage', 'video'],
        ['audioMessage', 'audio'],
        ['stickerMessage', 'sticker'],
        ['documentMessage', 'document']
    ];
    for (const raw of rawTargets) {
        const norm = typeof normalizeMessageContent === 'function' ? (normalizeMessageContent(raw) || raw) : raw;
        if (!norm || typeof norm !== 'object') continue;
        for (const [field, dlType] of typeMap) {
            if (norm[field]) {
                try {
                    const stream = await downloadContentFromMessage(norm[field], dlType);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    const buf = Buffer.concat(chunks);
                    if (buf.length > 0) return buf;
                } catch (_) {}
            }
        }
    }
    return null;
}

function resolveToolMediaMeta(m, qmsg, quoted, mime) {
    const node = (m?.quoted && (m.quoted.msg || m.quoted)) || (quoted && (quoted.msg || quoted)) || qmsg || m?.msg || {};
    const detectedMime = mime || node.mimetype || '';
    const fileName = node.fileName || node.filename || '';
    const targetType = (m?.quoted?.type || quoted?.type || m?.type || '').toLowerCase();
    const hasMedia = Boolean(
        detectedMime ||
        /(image|video|audio|sticker|document|ptv|viewonce)/i.test(targetType) ||
        m?.quoted?.message?.imageMessage ||
        m?.quoted?.message?.videoMessage ||
        m?.quoted?.message?.audioMessage ||
        m?.quoted?.message?.stickerMessage ||
        m?.quoted?.message?.documentMessage
    );
    return { hasMedia, mimeType: detectedMime, fileName };
}

global.pomodoroTimers = global.pomodoroTimers || {};

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

const PROVINCE_MAP = {
    '11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '14': 'Riau',
    '15': 'Jambi', '16': 'Sumatera Selatan', '17': 'Bengkulu', '18': 'Lampung',
    '19': 'Kep. Bangka Belitung', '21': 'Kep. Riau', '31': 'DKI Jakarta', '32': 'Jawa Barat',
    '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur', '36': 'Banten',
    '51': 'Bali', '52': 'Nusa Tenggara Barat', '53': 'Nusa Tenggara Timur', '61': 'Kalimantan Barat',
    '62': 'Kalimantan Tengah', '63': 'Kalimantan Selatan', '64': 'Kalimantan Timur', '65': 'Kalimantan Utara',
    '71': 'Sulawesi Utara', '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan', '74': 'Sulawesi Tenggara',
    '75': 'Gorontalo', '76': 'Sulawesi Barat', '81': 'Maluku', '82': 'Maluku Utara',
    '91': 'Papua Barat', '92': 'Papua Barat Daya', '94': 'Papua', '95': 'Papua Selatan',
    '96': 'Papua Tengah', '97': 'Papua Pegunungan'
};

function getZodiac(day, month) {
    const signs = [
        [1, 20, 'Capricorn'], [2, 19, 'Aquarius'], [3, 21, 'Pisces'], [4, 20, 'Aries'],
        [5, 21, 'Taurus'], [6, 21, 'Gemini'], [7, 23, 'Cancer'], [8, 23, 'Leo'],
        [9, 23, 'Virgo'], [10, 23, 'Libra'], [11, 22, 'Scorpio'], [12, 22, 'Sagittarius']
    ];
    for (const [m, cutoff, name] of signs) {
        if (month === m) return day < cutoff ? name : signs[m % 12][2];
    }
    return 'Capricorn';
}

function parseNikOffline(nik) {
    const clean = String(nik || '').replace(/[^0-9]/g, '');
    if (clean.length !== 16) return null;
    const provCode = clean.slice(0, 2);
    const cityCode = clean.slice(0, 4);
    const distCode = clean.slice(0, 6);
    let day = parseInt(clean.slice(6, 8), 10);
    const month = parseInt(clean.slice(8, 10), 10);
    const yy = parseInt(clean.slice(10, 12), 10);
    const serial = clean.slice(12, 16);

    const gender = day > 40 ? 'Perempuan' : 'Laki-laki';
    if (day > 40) day -= 40;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    const curYY = new Date().getFullYear() % 100;
    const year = yy <= curYY ? 2000 + yy : 1900 + yy;
    const dob = new Date(year, month - 1, day);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const mDiff = now.getMonth() - dob.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--;

    return {
        nik: clean,
        provinsi: PROVINCE_MAP[provCode] || `Kode Provinsi ${provCode}`,
        kodeWilayah: `${provCode}.${cityCode.slice(2)}.${distCode.slice(4)}`,
        gender,
        tanggalLahir: `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
        usia: `${age} tahun`,
        zodiak: getZodiac(day, month),
        nomorUrut: serial
    };
}

function convertCjsToEsm(code) {
    return String(code)
        .replace(/const\s+(\w+)\s*=\s*require\((['"`][^'"`]+['"`])\);?/g, 'import $1 from $2;')
        .replace(/const\s+(\{[^}]+\})\s*=\s*require\((['"`][^'"`]+['"`])\);?/g, 'import $1 from $2;')
        .replace(/module\.exports\s*=\s*/g, 'export default ')
        .replace(/exports\.(\w+)\s*=\s*/g, 'export const $1 = ');
}

function convertEsmToCjs(code) {
    return String(code)
        .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+(['"`][^'"`]+['"`]);?/g, 'const $1 = require($2);')
        .replace(/import\s+(\{[^}]+\})\s+from\s+(['"`][^'"`]+['"`]);?/g, 'const $1 = require($2);')
        .replace(/import\s+(\w+)\s+from\s+(['"`][^'"`]+['"`]);?/g, 'const $1 = require($2);')
        .replace(/export\s+default\s+/g, 'module.exports = ')
        .replace(/export\s+(?:async\s+)?function\s+(\w+)/g, 'exports.$1 = function $1')
        .replace(/export\s+(?:const|let|var)\s+(\w+)\s*=/g, 'exports.$1 =');
}

module.exports = {
    downloadContentFromMessage,
    normalizeMessageContent,
    downloadToolMediaSafely,
    resolveToolMediaMeta,
    cleanNum,
    PROVINCE_MAP,
    getZodiac,
    parseNikOffline,
    convertCjsToEsm,
    convertEsmToCjs
};
