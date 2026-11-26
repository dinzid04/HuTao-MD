const { os, sendRichTable, formatBytes, formatUptime } = require('./_helper');

module.exports = {
    name: 'richstats',
    category: 'richgame',
    commands: ['richstats', 'stats', 'botstats', 'stat'],

    async execute(ctx) {
        const { Dinz, m, text, validCommandsList, moment, botCtx } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '📊', key: m.key } }).catch(() => {});
        const id = botCtx.getBotIdentity(Dinz);
        const mem = process.memoryUsage();
        const totalMem = os.totalmem();
        const usedMem = totalMem - os.freemem();
        const totalUsers = Object.keys(global.db?.users || {}).length;
        const totalGroups = Object.keys(global.db?.groups || {}).length;
        const premList = botCtx.getSection('premium', Dinz) || [];
        const totalClans = Object.keys(botCtx.getSection('clans', Dinz) || {}).length;
        const lidCount = Object.keys(global.lidMap || {}).length;
        const dbMode = botCtx.getStorageMode ? botCtx.getStorageMode().toUpperCase() : 'LOCAL';
        const nowWib = moment().tz('Asia/Jakarta').format('HH:mm:ss [WIB]');

        await sendRichTable(Dinz, m, {
            title: `${id.botname} Statistics`,
            intro: `📊 *Statistik Realtime ${id.botname}*`,
            headers: ['Parameter', 'Nilai'],
            rows: [
                ['Bot Name', id.botname],
                ['Total Fitur', `${validCommandsList.length} command`],
                ['Uptime', formatUptime(process.uptime())],
                ['Database', `${dbMode} (${totalUsers} user, ${totalGroups} grup)`],
                ['Premium / Clan', `${Array.isArray(premList) ? premList.length : 0} prem / ${totalClans} clan`],
                ['LID Cache', `${lidCount} akun terpetakan`],
                ['Node / OS', `${process.version} (${os.platform()} ${os.arch()})`],
                ['RAM System', `${formatBytes(usedMem)} / ${formatBytes(totalMem)}`],
                ['Heap Used', `${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`],
                ['Waktu', nowWib]
            ],
            footer: `© ${id.botname}`
        });
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return true;
    }
};
