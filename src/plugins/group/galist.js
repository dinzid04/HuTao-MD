const { formatCard } = require('./_helper');

module.exports = {
    name: 'galist',
    category: 'group',
    commands: ['galist', 'listgiveaway', 'giveawaylist'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;

        const giveaways = botCtx.getSection('giveaways', Dinz) || {};
        const items = Object.values(giveaways).filter((g) => !m.isGroup || g.chatId === m.chat);
        if (!items.length) return Reply('📋 Belum ada giveaway yang tercatat.');
        const body = items.slice(-10).map((g) => {
            const st = g.ended ? '🔴 Selesai' : '🟢 Aktif';
            return `◦ \`${g.id}\` | ${st} | *${g.title}* (${g.participants.length} peserta)`;
        }).join('\n');
        return Reply(formatCard({ icon: '🎁', title: 'DAFTAR GIVEAWAY', body }));
    }
};
