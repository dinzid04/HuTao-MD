const { formatCard, formatNumber, calcClanPower } = require('./_helper');

module.exports = {
    name: 'clanleaderboard',
    category: 'clan',
    commands: ['clanleaderboard', 'clanlb', 'topclan'],

    async execute(ctx) {
        const { Dinz, Reply, botCtx, usedPrefix } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};

        const list = Object.values(clans);
        if (!list.length) return Reply(`🏆 Belum ada clan yang berdiri. Jadi yang pertama dengan \`${usedPrefix}clancreate <nama>\`!`);
        const sorted = list
            .map((c) => ({ ...c, power: calcClanPower(c) }))
            .sort((a, b) => b.power - a.power)
            .slice(0, 15);
        const body = sorted.map((c, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${medal} ${c.emblem} *${c.name}* (\`${c.id}\`)\n    Lv.${c.level} | Power: ${formatNumber(c.power)} | ${c.wins}W-${c.losses}L | ${c.members.length} member`;
        }).join('\n');
        return Reply(formatCard({ icon: '🏆', title: 'CLAN LEADERBOARD', body }));
    }
};
