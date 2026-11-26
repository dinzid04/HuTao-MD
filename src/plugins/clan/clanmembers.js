const { formatCard, MAX_MEMBERS, cleanNum, getUser } = require('./_helper');

module.exports = {
    name: 'clanmembers',
    category: 'clan',
    commands: ['clanmembers'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const user = getUser(m.sender);

        if (!user.clanId || !clans[user.clanId]) return Reply('❌ Kamu belum bergabung di clan.');
        const clan = clans[user.clanId];
        const body = clan.members.map((jid, i) => {
            const u = getUser(jid);
            const badge = jid === clan.leader ? '👑' : '⚔️';
            return `${i + 1}. ${badge} @${cleanNum(jid)} (Lv.${u.level || 1})`;
        }).join('\n');
        return Reply(formatCard({
            icon: clan.emblem || '🏰',
            title: `MEMBER ${clan.name} (${clan.members.length}/${MAX_MEMBERS})`,
            body
        }), clan.members);
    }
};
