const fs = require('fs');
const path = require('path');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

function normalizeWaNumber(raw) {
    let digits = String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (digits.startsWith('08')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) digits = '62' + digits;
    return digits;
}

function requireClonerOwner(ctx) {
    const { Dinz, isCreator, Reply, usedPrefix } = ctx;
    if (!Dinz || !Dinz.isJadibot || !Dinz.jadibotNumber) {
        Reply(
            `ℹ️ *Fitur Khusus Bot Clone (Jadibot)*\n` +
            `> ◦ Perintah ini dijalankan langsung di dalam bot clone/jadibot untuk mengubah identitas cloner-nya sendiri.\n` +
            `> ◦ Untuk mengubah pengaturan *Bot Utama*, ketik \`${usedPrefix}menu setup\` atau \`${usedPrefix}ceksetup\`.`
        );
        return null;
    }
    if (!isCreator) {
        Reply(global.mess.owner);
        return null;
    }
    return normalizeWaNumber(Dinz.jadibotNumber);
}

function getCloneMediaDir(cloneNumber, botCtx) {
    const dir = path.join(botCtx.getJadibotMediaDir(cloneNumber), 'media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function clearCloneCaches(cloneMediaDir, oldUrl) {
    if (global._menuImgCache && typeof global._menuImgCache.delete === 'function') {
        if (oldUrl) global._menuImgCache.delete(oldUrl);
        for (const f of ['menu.jpg', 'menu.png', 'menu.jpeg']) {
            global._menuImgCache.delete(path.join(cloneMediaDir, f));
        }
    }
    if (global._audioMenuCache instanceof Map) {
        for (const f of ['menu.ogg', 'menu.mp3', 'menu.m4a']) {
            global._audioMenuCache.delete(path.join(cloneMediaDir, f));
        }
    }
}

function patchCloneConfig(cloneNumber, patch, botCtx, jadibotMgr) {
    const num = normalizeWaNumber(cloneNumber);
    const reg = botCtx.getJadibotRegistry();
    if (!reg[num]) {
        reg[num] = { status: 'running', config: {}, requester: num, createdAt: Date.now() };
    }
    const prevCfg = reg[num].config || {};
    const nextCfg = { ...prevCfg, ...patch };
    if (patch.image) {
        nextCfg.image = { ...(prevCfg.image || {}), ...patch.image };
    }
    if (patch.payment) {
        nextCfg.payment = { ...(prevCfg.payment || {}), ...patch.payment };
    }
    reg[num].config = nextCfg;
    botCtx.saveJadibotRegistry(reg);

    if (jadibotMgr && typeof jadibotMgr.getJadibotConfig === 'function') {
        const inst = jadibotMgr.getJadibotInstance ? jadibotMgr.getJadibotInstance(num) : null;
        const freshCfg = jadibotMgr.getJadibotConfig(num);
        if (inst && freshCfg) {
            inst.jadibotConfig = freshCfg;
            if (inst.socket) inst.socket.jadibotConfig = freshCfg;
        }
    }
    return botCtx.getJadibotIdentity(num);
}

async function uploadCloneImageToCdn(buffer, mimeType, uploadToCDN) {
    try {
        const uploader = require('../../services/uploader');
        const generateFilename = (m) => `clone_${Date.now()}.${uploader.getMimeExt(m)}`;
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

async function saveCloneLocalMenuImage(cloneNumber, bufferOrUrl, botCtx, axios) {
    try {
        const mediaDir = getCloneMediaDir(cloneNumber, botCtx);
        let buf = Buffer.isBuffer(bufferOrUrl) ? bufferOrUrl : null;
        if (!buf && typeof bufferOrUrl === 'string' && /^https?:\/\//i.test(bufferOrUrl) && axios) {
            const res = await axios.get(bufferOrUrl, { responseType: 'arraybuffer', timeout: 15000 }).catch(() => null);
            if (res && res.status === 200 && res.data && res.data.length > 512) {
                buf = Buffer.from(res.data);
            }
        }
        if (buf && buf.length > 0) {
            for (const old of ['menu.png', 'menu.jpeg']) {
                const p = path.join(mediaDir, old);
                if (fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch (_) {}
                }
            }
            fs.writeFileSync(path.join(mediaDir, 'menu.jpg'), buf);
            clearCloneCaches(mediaDir);
            return true;
        }
    } catch (_) {}
    return false;
}

module.exports = {
    formatCard,
    toMono,
    toBoldSans,
    normalizeWaNumber,
    requireClonerOwner,
    getCloneMediaDir,
    clearCloneCaches,
    patchCloneConfig,
    uploadCloneImageToCdn,
    saveCloneLocalMenuImage
};
