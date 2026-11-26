const botCtx = require('../core/context');

function loadPremiumUsers() {
    try {
        const list = botCtx.getSection('premium');
        return Array.isArray(list) ? list : [];
    } catch (_) {
        return [];
    }
}

function savePremiumUsers(data) {
    try {
        botCtx.setSection('premium', Array.isArray(data) ? data : []);
    } catch (_) {}
}

function cleanExpiredUsers() {
    const list = loadPremiumUsers();
    const now = Date.now();
    const active = list.filter((u) => u.expired > now);
    if (active.length !== list.length) {
        savePremiumUsers(active);
    }
    return active;
}

function addPremiumUser(targetPhone, days = 30) {
    const cleanNum = String(targetPhone).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!cleanNum) return false;

    cleanExpiredUsers();
    const list = loadPremiumUsers();
    const now = Date.now();
    const durationMs = parseInt(days, 10) * 24 * 60 * 60 * 1000;

    const existingIndex = list.findIndex((u) => u.id === cleanNum);
    let expiredTimestamp = now + durationMs;

    if (existingIndex !== -1) {
        const currentExpired = Math.max(now, list[existingIndex].expired);
        expiredTimestamp = currentExpired + durationMs;
        list[existingIndex].expired = expiredTimestamp;
        list[existingIndex].days = (list[existingIndex].days || 0) + parseInt(days, 10);
        list[existingIndex].updatedAt = now;
    } else {
        list.push({
            id: cleanNum,
            expired: expiredTimestamp,
            addedAt: now,
            days: parseInt(days, 10)
        });
    }

    savePremiumUsers(list);
    return {
        id: cleanNum,
        expired: expiredTimestamp,
        days: parseInt(days, 10)
    };
}

function delPremiumUser(targetPhone) {
    const cleanNum = String(targetPhone).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!cleanNum) return false;

    const list = loadPremiumUsers();
    const filtered = list.filter((u) => u.id !== cleanNum);
    const removed = filtered.length !== list.length;
    if (removed) {
        savePremiumUsers(filtered);
    }
    return removed;
}

function isPremiumUser(targetPhone, isOwnerOrCreator = false) {
    if (isOwnerOrCreator) return true;
    const cleanNum = String(targetPhone).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!cleanNum) return false;

    const list = cleanExpiredUsers();
    const user = list.find((u) => u.id === cleanNum);
    if (!user) return false;
    return user.expired > Date.now();
}

function formatRemainingTime(expiredTimestamp) {
    const remaining = expiredTimestamp - Date.now();
    if (remaining <= 0) return 'Expired';

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    const parts = [];
    if (days > 0) parts.push(`${days} Hari`);
    if (hours > 0) parts.push(`${hours} Jam`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} Menit`);
    return parts.join(' ') || 'Kurang dari 1 menit';
}

function getPremiumList() {
    const active = cleanExpiredUsers();
    return active.map((u) => ({
        id: u.id,
        expired: u.expired,
        remaining: formatRemainingTime(u.expired),
        days: u.days
    }));
}

module.exports = {
    addPremiumUser,
    delPremiumUser,
    isPremiumUser,
    getPremiumList,
    formatRemainingTime,
    loadPremiumUsers
};
