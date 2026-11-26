const { formatCard, formatNumber, MAX_MEMBERS, cleanNum, getUser, calcClanPower } = require('./_helper');

module.exports = {
    name: 'claninfo',
    category: 'clan',
    commands: ['claninfo', 'myclan', 'infoclan'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, botCtx, usedPrefix } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const user = getUser(m.sender);

        const query = text.trim();
        let clan = null;
        if (query) {
            clan = clans[query.toUpperCase()]
                || Object.values(clans).find((c) => c.name.toLowerCase() === query.toLowerCase());
        } else if (user.clanId) {
            clan = clans[user.clanId];
        }
        if (!clan) {
            return Reply(`❌ Clan tidak ditemukan. Buat baru dengan \`${usedPrefix}clancreate <nama>\` atau lihat daftar via \`${usedPrefix}clanleaderboard\`.`);
        }
        const power = calcClanPower(clan);
        const wr = (clan.wins + clan.losses) > 0
            ? `${Math.round((clan.wins / (clan.wins + clan.losses)) * 100)}%`
            : '0%';
        return Reply(formatCard({
            icon: clan.emblem || '🏰',
            title: `CLAN ${clan.name}`,
            rows: [
                { label: 'ID', value: `\`${clan.id}\`` },
                { label: 'Leader', value: `@${cleanNum(clan.leader)}` },
                { label: 'Level / EXP', value: `Lv.${clan.level} (${formatNumber(clan.exp)} EXP)` },
                { label: 'Total Power', value: formatNumber(power) },
                { label: 'Member', value: `${clan.members.length}/${MAX_MEMBERS}` },
                { label: 'Rekor War', value: `${clan.wins}W / ${clan.losses}L (${wr})` }
            ]
        }), [clan.leader]);
    }
};
