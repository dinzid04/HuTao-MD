const botCtx = require('../core/context');

function loadAfkData() {
    try {
        const data = botCtx.getSection('afk');
        return data && typeof data === 'object' ? data : {};
    } catch (_) {
        return {};
    }
}

function saveAfkData(data) {
    try {
        botCtx.setSection('afk', data);
    } catch (e) {
        console.error('[AFK Save Error]', e.message);
    }
}

function setAfk(userJid, reason = 'Tanpa Alasan') {
    const afkData = loadAfkData();
    afkData[userJid] = {
        reason: reason.trim() || 'Tanpa Alasan',
        time: Date.now()
    };
    saveAfkData(afkData);
    return afkData[userJid];
}

function getAfk(userJid) {
    const afkData = loadAfkData();
    return afkData[userJid] || null;
}

function removeAfk(userJid) {
    const afkData = loadAfkData();
    if (afkData[userJid]) {
        const previousData = { ...afkData[userJid] };
        delete afkData[userJid];
        saveAfkData(afkData);
        return previousData;
    }
    return null;
}

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} Hari`);
    if (hours > 0) parts.push(`${hours} Jam`);
    if (minutes > 0) parts.push(`${minutes} Menit`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} Detik`);

    return parts.join(' ');
}

module.exports = {
    setAfk,
    getAfk,
    removeAfk,
    formatDuration
};
