const { formatCard, formatNumber } = require('../../utils/formatter');

global.rpgExtraCd = global.rpgExtraCd || {};

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

function checkCd(key, ms) {
    const prev = global.rpgExtraCd[key] || 0;
    const left = ms - (Date.now() - prev);
    if (left > 0) return Math.ceil(left / 1000);
    global.rpgExtraCd[key] = Date.now();
    return 0;
}

function getCouplesState(botCtx, Dinz) {
    const couples = botCtx.getSection('couples', Dinz) || {};
    const saveCouples = () => botCtx.setSection('couples', couples, Dinz);
    return { couples, saveCouples };
}

const JOB_MAP = {
    beg: { title: 'NGEMIS', icon: '🙏', min: 150, max: 650, exp: 35, cd: 60000 },
    ngemis: { title: 'NGEMIS', icon: '🙏', min: 150, max: 650, exp: 35, cd: 60000 },
    ngamen: { title: 'NGAMEN', icon: '🎸', min: 400, max: 1400, exp: 60, cd: 90000 },
    parkir: { title: 'TUKANG PARKIR', icon: '🅿️', min: 500, max: 1600, exp: 70, cd: 90000 },
    kurir: { title: 'KURIR PAKET', icon: '📦', min: 900, max: 2500, exp: 110, cd: 120000 },
    berladang: { title: 'BERLADANG', icon: '🌾', min: 1100, max: 3200, exp: 140, cd: 150000 }
};

async function runRpgJob(ctx, jobKey) {
    const { m, command, Reply } = ctx;
    const key = jobKey || command;
    const job = JOB_MAP[key];
    const wait = checkCd(`${command}_${m.sender}`, job.cd);
    if (wait > 0) return Reply(`⏳ Istirahat sebentar! Tunggu *${wait} detik* lagi.`);
    const earn = job.min + Math.floor(Math.random() * (job.max - job.min));
    const u = getUser(m.sender);
    u.money += earn;
    u.exp += job.exp;
    return Reply(formatCard({
        icon: job.icon,
        title: job.title,
        rows: [
            { label: 'Pendapatan', value: `+Rp ${formatNumber(earn)}` },
            { label: 'EXP', value: `+${job.exp} EXP` },
            { label: 'Total Saldo', value: `Rp ${formatNumber(u.money)}` }
        ]
    }));
}

module.exports = {
    formatCard,
    formatNumber,
    cleanNum,
    getUser,
    checkCd,
    getCouplesState,
    JOB_MAP,
    runRpgJob
};
