const { formatCard, formatNumber, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'topchat',
    category: 'group',
    commands: ['topchat', 'chatstats', 'totalchat'],

    async execute(ctx) {
        const { m, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const g = getGroupObj(m.chat);
        const stats = g.chatStats || {};
        const sorted = Object.entries(stats)
            .map(([jid, d]) => ({ jid, count: d?.count || 0 }))
            .filter((x) => x.count > 0)
            .sort((a, b) => b.count - a.count);
        if (!sorted.length) return Reply('📊 Belum ada data statistik chat di grup ini.');
        const top = sorted.slice(0, 20);
        const totalAll = sorted.reduce((acc, x) => acc + x.count, 0);
        const body = top.map((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${medal} @${cleanNum(u.jid)} : *${formatNumber(u.count)}* pesan`;
        }).join('\n');
        return Reply(formatCard({
            icon: '📊',
            title: 'TOP CHAT GRUP',
            rows: [
                { label: 'Member Aktif', value: `${sorted.length} orang` },
                { label: 'Total Pesan', value: `${formatNumber(totalAll)} pesan` }
            ],
            body
        }), top.map((u) => u.jid));
    }
};
