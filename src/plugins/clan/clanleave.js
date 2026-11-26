const { cleanNum, getUser } = require('./_helper');

module.exports = {
    name: 'clanleave',
    category: 'clan',
    commands: ['clanleave'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const user = getUser(m.sender);

        if (!user.clanId || !clans[user.clanId]) return Reply('❌ Kamu tidak sedang berada di clan.');
        const clan = clans[user.clanId];
        clan.members = clan.members.filter((x) => x !== m.sender);
        delete user.clanId;

        if (clan.members.length === 0) {
            delete clans[clan.id];
            saveClans();
            return Reply(`🏚️ Kamu keluar dan clan *${clan.name}* dibubarkan karena sudah tidak ada member.`);
        }
        if (clan.leader === m.sender) {
            clan.leader = clan.members[0];
        }
        saveClans();
        return Reply(`🚪 Kamu telah keluar dari clan *${clan.name}*. Leader saat ini: @${cleanNum(clan.leader)}.`, [clan.leader]);
    }
};
