const { os, formatCard, sendRichPingDashboard, formatBytes, formatUptime } = require('./_helper');

module.exports = {
    name: 'richping',
    category: 'richgame',
    commands: ['richping', 'pingrich', 'serverstats', 'monitor'],

    async execute(ctx) {
        const { Dinz, m, text, Reply } = ctx;

        const start = Date.now();
        await Dinz.sendMessage(m.chat, { react: { text: '⚡', key: m.key } }).catch(() => {});
        try {
            const latency = Math.max(1, Date.now() - start);
            await sendRichPingDashboard(Dinz, m, latency);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            const latency = Math.max(1, Date.now() - start);
            const mem = process.memoryUsage();
            return Reply(formatCard({
                icon: '⚡',
                title: 'SERVER MONITOR',
                rows: [
                    { label: 'Latency', value: `${latency} ms` },
                    { label: 'Bot Uptime', value: formatUptime(process.uptime()) },
                    { label: 'RAM Heap', value: `${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}` },
                    { label: 'Node.js', value: process.version },
                    { label: 'Platform', value: `${os.platform()} ${os.arch()} (${os.cpus().length} core)` }
                ]
            }));
        }
        return true;
    }
};
