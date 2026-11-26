const { formatCard, formatNumber } = require('../../utils/formatter');

const CREATE_COST = 50000;
const MAX_MEMBERS = 50;
const EMBLEMS = ['🐉', '🦅', '🐺', '🦁', '🔥', '⚡', '🌙', '☀️', '💎', '🗡️'];

global.clanWarCooldowns = global.clanWarCooldowns || {};

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getUser(jid) {
    if (!global.db.users[jid] || typeof global.db.users[jid] !== 'object') global.db.users[jid] = {};
    const u = global.db.users[jid];
    if (typeof u.money !== 'number') u.money = 0;
    if (typeof u.exp !== 'number') u.exp = 0;
    if (typeof u.level !== 'number') u.level = 1;
    return u;
}

function genClanId(name, clans) {
    const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    let base = clean.length >= 3 ? clean.slice(0, 3) : clean.padEnd(3, 'X');
    if (!clans[base]) return base;
    for (let i = 1; i <= 99; i++) {
        if (!clans[`${base}${i}`]) return `${base}${i}`;
    }
    return `${base}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

function calcClanPower(clan) {
    let power = (clan.level || 1) * 500 + (clan.wins || 0) * 60;
    for (const jid of clan.members || []) {
        const u = getUser(jid);
        power += (u.level || 1) * 100 + Math.floor((u.exp || 0) / 10);
    }
    return Math.floor(power);
}

module.exports = {
    formatCard,
    formatNumber,
    CREATE_COST,
    MAX_MEMBERS,
    EMBLEMS,
    cleanNum,
    getUser,
    genClanId,
    calcClanPower
};
