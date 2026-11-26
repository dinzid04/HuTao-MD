const botCtx = require('../core/context');

function getWIBTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 60 * 60000);
}

function getSectionSafe(name, fallback) {
    try {
        const val = botCtx.getSection(name);
        if (Array.isArray(fallback)) {
            return Array.isArray(val) ? val : fallback;
        }
        return val && typeof val === 'object' ? val : fallback;
    } catch (_) {
        return fallback;
    }
}

function getLimitConfig() {
    const cfg = getSectionSafe('limit_config', { enabled: true, defaultLimit: 25, commandCost: 1, limitPrice: 1500, users: {} });
    if (!cfg.users || typeof cfg.users !== 'object') cfg.users = {};
    if (typeof cfg.enabled !== 'boolean') cfg.enabled = true;
    if (!cfg.defaultLimit || cfg.defaultLimit < 1) cfg.defaultLimit = 25;
    if (!cfg.commandCost || cfg.commandCost < 1) cfg.commandCost = 1;
    if (!cfg.limitPrice || cfg.limitPrice < 1) cfg.limitPrice = 1500;
    return cfg;
}

function isLimitEnabled() {
    return getLimitConfig().enabled !== false;
}

function setLimitEnabled(enabled) {
    const config = getLimitConfig();
    config.enabled = Boolean(enabled);
    botCtx.setSection('limit_config', config);
    return config.enabled;
}

function setCommandLimitCost(cost) {
    const config = getLimitConfig();
    const n = Math.min(20, Math.max(1, parseInt(cost, 10) || 1));
    config.commandCost = n;
    botCtx.setSection('limit_config', config);
    return n;
}

function setLimitPrice(price) {
    const config = getLimitConfig();
    const n = Math.max(100, parseInt(price, 10) || 1500);
    config.limitPrice = n;
    botCtx.setSection('limit_config', config);
    return n;
}

function getUserMaxLimit(jid) {
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const config = getLimitConfig();
    const today = getWIBTime().toISOString().split('T')[0];
    let maxLimit = config.defaultLimit || 25;

    if (config.users && config.users[cleanJid]) {
        maxLimit = config.users[cleanJid];
    }

    const claimDB = getSectionSafe('claim', {});
    if (claimDB[cleanJid] === today) {
        maxLimit += 5;
    }

    const bonusDB = getSectionSafe('limit_bonus', {});
    if (bonusDB[cleanJid] && bonusDB[cleanJid].date === today) {
        maxLimit += (bonusDB[cleanJid].bonus || 0);
    }

    return maxLimit;
}

function checkLimit(jid, isCreator) {
    if (isCreator) return false;
    if (!isLimitEnabled()) return false;

    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const maxLimit = getUserMaxLimit(cleanJid);
    const usageDB = getSectionSafe('limit_usage', []);
    const today = getWIBTime().toISOString().split('T')[0];
    const user = usageDB.find((v) => v.jid === cleanJid);

    if (!user) return false;
    if (user.date !== today) return false;

    return user.count >= maxLimit;
}

function addLimit(jid, isCreator, amount) {
    if (isCreator) return;
    if (!isLimitEnabled()) return;

    const cfg = getLimitConfig();
    const deduct = (typeof amount === 'number' && amount > 0) ? amount : (cfg.commandCost || 1);
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const usageDB = getSectionSafe('limit_usage', []);
    const today = getWIBTime().toISOString().split('T')[0];
    const user = usageDB.find((v) => v.jid === cleanJid);

    if (!user) {
        usageDB.push({ jid: cleanJid, date: today, count: deduct });
    } else if (user.date !== today) {
        user.date = today;
        user.count = deduct;
    } else {
        user.count += deduct;
    }

    botCtx.setSection('limit_usage', usageDB);
}

function claimLimit(jid) {
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const claimDB = getSectionSafe('claim', {});
    const today = getWIBTime().toISOString().split('T')[0];

    if (claimDB[cleanJid] === today) {
        return {
            success: false,
            message: 'Kamu sudah mengklaim bonus limit hari ini!\n> Kuota claim akan di-reset kembali pada jam 00:00 WIB.'
        };
    }

    claimDB[cleanJid] = today;
    botCtx.setSection('claim', claimDB);
    return { success: true, message: 'Berhasil mengklaim +5 bonus limit harian!' };
}

function addBonusLimit(jid, amount) {
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const bonusDB = getSectionSafe('limit_bonus', {});
    const today = getWIBTime().toISOString().split('T')[0];

    if (!bonusDB[cleanJid] || bonusDB[cleanJid].date !== today) {
        bonusDB[cleanJid] = { bonus: 0, date: today };
    }

    bonusDB[cleanJid].bonus += amount;
    botCtx.setSection('limit_bonus', bonusDB);
}

function setUserCustomLimit(jid, amount) {
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const config = getLimitConfig();
    if (!config.users) config.users = {};

    if (amount > 0) {
        config.users[cleanJid] = amount;
    } else {
        delete config.users[cleanJid];
    }

    botCtx.setSection('limit_config', config);
}

function setDefaultDailyLimit(amount) {
    const config = getLimitConfig();
    const newLimit = Math.max(1, parseInt(amount, 10) || 25);
    config.defaultLimit = newLimit;
    botCtx.setSection('limit_config', config);
    return newLimit;
}

function resetAllLimitUsage() {
    botCtx.setSection('limit_usage', []);
}

function getUserLimitInfo(jid, isCreator) {
    const cleanJid = (jid || '').split(':')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    if (isCreator) {
        return {
            isOwner: true,
            statusText: 'Owner',
            limitInfo: '∞ Unlimited',
            progressBar: '██████████'
        };
    }

    if (!isLimitEnabled()) {
        return {
            isOwner: false,
            limitDisabled: true,
            statusText: 'Free Mode',
            maxLimit: Infinity,
            userUsage: 0,
            remaining: Infinity,
            claimStatus: '-',
            percent: 0,
            progressBar: '██████████',
            limitInfo: '∞ Bebas (Sistem Limit OFF)'
        };
    }

    const maxLimit = getUserMaxLimit(cleanJid);
    const usageDB = getSectionSafe('limit_usage', []);
    const today = getWIBTime().toISOString().split('T')[0];
    const userUsage = usageDB.find((u) => u.jid === cleanJid && u.date === today)?.count || 0;
    const remaining = Math.max(0, maxLimit - userUsage);

    const claimDB = getSectionSafe('claim', {});
    const claimStatus = claimDB[cleanJid] === today ? 'Sudah' : 'Belum';

    const percent = Math.min(100, Math.round((userUsage / maxLimit) * 100));
    const barLength = 10;
    const filled = Math.min(barLength, Math.round((percent / 100) * barLength));
    const empty = barLength - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    return {
        isOwner: false,
        statusText: 'User',
        maxLimit,
        userUsage,
        remaining,
        claimStatus,
        percent,
        progressBar,
        limitInfo: `${userUsage}/${maxLimit} • Sisa: ${remaining}`
    };
}

module.exports = {
    getWIBTime,
    getLimitConfig,
    isLimitEnabled,
    setLimitEnabled,
    setCommandLimitCost,
    setLimitPrice,
    getUserMaxLimit,
    checkLimit,
    addLimit,
    claimLimit,
    addBonusLimit,
    setUserCustomLimit,
    setDefaultDailyLimit,
    resetAllLimitUsage,
    getUserLimitInfo
};
