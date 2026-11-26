const fs = require('fs');
const path = require('path');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

const MAIN_DEFAULT_CONFIG = {
    owner: '628990936282',
    namaOwner: 'DinzID',
    packname: 'HuTao - MD',
    botname: 'HuTao - MD',
    asciiName: 'HuTao - MD',
    asciiFont: 'ANSI Shadow',
    audiomenu: true,
    image: {
        menu: 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg',
        qris: 'https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg'
    },
    payment: {
        qris: 'https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg',
        dana: '6285187652117',
        gopay: '6285187652117',
        an: 'HuTao - MD'
    }
};

function getSettingsPath() {
    return path.join(process.cwd(), 'settings.js');
}

function escapeSingleQuote(val) {
    return String(val ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

function escapeDoubleQuote(val) {
    return String(val ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, ' ');
}

function requireMainSetupAccess(ctx) {
    const { Dinz, isCreator, isMainOwner, Reply } = ctx;
    if (Dinz && Dinz.isJadibot) {
        Reply(
            `🔒 *Fitur Khusus Bot Utama*\n` +
            `> ◦ Perintah ini tidak bisa digunakan di bot clone / jadibot.\n` +
            `> ◦ Gunakan *menu cloner* (atau *cekcloner*) untuk mengatur bot clone kamu sendiri!`
        );
        return false;
    }
    if (!isCreator || !isMainOwner) {
        Reply(global.mess.owner);
        return false;
    }
    return true;
}

function clearMediaCaches() {
    if (global._menuImgCache && typeof global._menuImgCache.clear === 'function') {
        global._menuImgCache.clear();
    }
    if (global._audioMenuCache instanceof Map) {
        global._audioMenuCache.clear();
    } else {
        global._audioMenuCache = new Map();
    }
}

function updateSettingsScalar(key, value, { isBoolean = false } = {}) {
    global._mainConfig = global._mainConfig || {};
    global._mainConfig[key] = value;

    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) return false;

    try {
        let src = fs.readFileSync(settingsPath, 'utf8');
        const literal = isBoolean ? (value ? 'true' : 'false') : `'${escapeSingleQuote(value)}'`;
        const re = new RegExp(`(global\\.${key}\\s*=\\s*)([^;\\n]+)(;)`);
        if (re.test(src)) {
            src = src.replace(re, `$1${literal}$3`);
        } else {
            const anchor = '// Auto-reload otomatis';
            const line = `global.${key} = ${literal};\n`;
            src = src.includes(anchor) ? src.replace(anchor, `${line}\n${anchor}`) : `${src}\n${line}`;
        }
        fs.writeFileSync(settingsPath, src, 'utf8');
        return true;
    } catch (e) {
        console.error(`[Setup] Gagal simpan ${key} ke settings.js:`, e.message);
        return false;
    }
}

function updateSettingsImage(patch = {}) {
    global._mainConfig = global._mainConfig || {};
    const nextImg = {
        menu: global._mainConfig.image?.menu || MAIN_DEFAULT_CONFIG.image.menu,
        qris: global._mainConfig.image?.qris || MAIN_DEFAULT_CONFIG.image.qris,
        ...patch
    };
    global._mainConfig.image = nextImg;
    clearMediaCaches();

    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) return nextImg;

    try {
        let src = fs.readFileSync(settingsPath, 'utf8');
        const entries = Object.entries(nextImg)
            .map(([k, v]) => `\t${k}: "${escapeDoubleQuote(v)}"`)
            .join(',\n');
        const block = `global.image = {\n${entries}\n};`;
        if (/global\.image\s*=\s*\{[\s\S]*?\};/.test(src)) {
            src = src.replace(/global\.image\s*=\s*\{[\s\S]*?\};/, block);
        } else {
            src += `\n${block}\n`;
        }
        fs.writeFileSync(settingsPath, src, 'utf8');
    } catch (e) {
        console.error('[Setup] Gagal simpan global.image ke settings.js:', e.message);
    }
    return nextImg;
}

function updateSettingsPayment(patch = {}) {
    global._mainConfig = global._mainConfig || {};
    const nextPay = {
        qris: global._mainConfig.payment?.qris || '',
        dana: global._mainConfig.payment?.dana || '',
        gopay: global._mainConfig.payment?.gopay || '',
        an: global._mainConfig.payment?.an || '',
        ...patch
    };
    global._mainConfig.payment = nextPay;

    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
        try {
            let src = fs.readFileSync(settingsPath, 'utf8');
            const block =
                `global.payment = {\n` +
                `\tqris: "${escapeDoubleQuote(nextPay.qris || '')}",\n` +
                `\tdana: "${escapeDoubleQuote(nextPay.dana || '')}",\n` +
                `\tgopay: "${escapeDoubleQuote(nextPay.gopay || '')}",\n` +
                `\tan: "${escapeDoubleQuote(nextPay.an || '')}"\n` +
                `};`;
            if (/global\.payment\s*=\s*\{[\s\S]*?\};/.test(src)) {
                src = src.replace(/global\.payment\s*=\s*\{[\s\S]*?\};/, block);
            } else {
                src += `\n${block}\n`;
            }
            fs.writeFileSync(settingsPath, src, 'utf8');
        } catch (e) {
            console.error('[Setup] Gagal simpan global.payment ke settings.js:', e.message);
        }
    }

    if (patch.qris) {
        updateSettingsImage({ qris: patch.qris });
    }
    return nextPay;
}

async function uploadImageToCdn(buffer, mimeType, uploadToCDN) {
    try {
        const uploader = require('../../services/uploader');
        const generateFilename = (m) => `upload_${Date.now()}.${uploader.getMimeExt(m)}`;
        const top4topRes = await uploader.uploadTop4Top(buffer, mimeType, generateFilename).catch(() => null);
        if (top4topRes?.downloadUrl) return top4topRes.downloadUrl;
        const uni = await uploader.uploadUniversalTourl(buffer, mimeType).catch(() => null);
        if (uni?.url) return uni.url;
    } catch (_) {}
    if (typeof uploadToCDN === 'function') {
        const fallback = await uploadToCDN(buffer, mimeType).catch(() => null);
        if (fallback) return fallback;
    }
    return '';
}

async function saveMainLocalMenuImage(bufferOrUrl, axios) {
    try {
        const mediaDir = path.join(process.cwd(), 'assets', 'media');
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        let buf = Buffer.isBuffer(bufferOrUrl) ? bufferOrUrl : null;
        if (!buf && typeof bufferOrUrl === 'string' && /^https?:\/\//i.test(bufferOrUrl) && axios) {
            const res = await axios.get(bufferOrUrl, { responseType: 'arraybuffer', timeout: 15000 }).catch(() => null);
            if (res && res.status === 200 && res.data && res.data.length > 512) {
                buf = Buffer.from(res.data);
            }
        }
        if (buf && buf.length > 0) {
            for (const old of ['menu.png', 'menu.jpeg', 'menu.jpg']) {
                const p = path.join(mediaDir, old);
                if (old !== 'menu.jpg' && fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch (_) {}
                }
            }
            fs.writeFileSync(path.join(mediaDir, 'menu.jpg'), buf);
            clearMediaCaches();
            return true;
        }
    } catch (_) {}
    return false;
}

function normalizeWaNumber(raw) {
    let digits = String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (digits.startsWith('08')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) digits = '62' + digits;
    return digits;
}

module.exports = {
    MAIN_DEFAULT_CONFIG,
    formatCard,
    toMono,
    toBoldSans,
    requireMainSetupAccess,
    clearMediaCaches,
    updateSettingsScalar,
    updateSettingsImage,
    updateSettingsPayment,
    uploadImageToCdn,
    saveMainLocalMenuImage,
    normalizeWaNumber
};
