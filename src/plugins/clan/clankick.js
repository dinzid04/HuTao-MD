const { cleanNum, getUser } = require('./_helper');

module.exports = {
    name: 'clankick',
    category: 'clan',
    commands: ['clankick'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const user = getUser(m.sender);

        if (!user.clanId || !clans[user.clanId]) return Reply('❌ Kamu tidak punya clan.');
        const clan = clans[user.clanId];
        if (clan.leader !== m.sender) return Reply('❌ Hanya Leader clan yang bisa mengeluarkan member.');
        const target = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!target) return Reply(`⚠️ Tag member yang ingin dikeluarkan.`);
        if (target === m.sender) return Reply('❌ Leader tidak bisa kick diri sendiri.');
        if (!clan.members.includes(target)) return Reply('❌ User tersebut bukan member clan kamu.');

        clan.members = clan.members.filter((x) => x !== target);
        const tu = getUser(target);
        delete tu.clanId;
        saveClans();
        return Reply(`👢 @${cleanNum(target)} telah dikeluarkan dari clan *${clan.name}*.`, [target]);
    }
};
