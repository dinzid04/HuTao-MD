const { MAX_MEMBERS, cleanNum, getUser } = require('./_helper');

module.exports = {
    name: 'clanjoin',
    category: 'clan',
    commands: ['clanjoin'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, botCtx, usedPrefix } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const invites = botCtx.getSection('clan_invites', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const saveInvites = () => botCtx.setSection('clan_invites', invites, Dinz);
        const user = getUser(m.sender);

        if (user.clanId && clans[user.clanId]) {
            return Reply(`❌ Kamu sudah berada di clan *${clans[user.clanId].name}*.`);
        }
        let targetId = text.trim().toUpperCase();
        if (!targetId && invites[m.sender]) targetId = invites[m.sender].clanId;
        const clan = clans[targetId]
            || Object.values(clans).find((c) => c.name.toLowerCase() === text.trim().toLowerCase());
        if (!clan) return Reply(`❌ Clan tidak ditemukan. Contoh: \`${usedPrefix}clanjoin <ID_CLAN>\``);
        if (clan.members.length >= MAX_MEMBERS) return Reply('❌ Clan sudah penuh.');

        clan.members.push(m.sender);
        user.clanId = clan.id;
        if (invites[m.sender]) { delete invites[m.sender]; saveInvites(); }
        saveClans();
        return Reply(`✅ Selamat datang @${cleanNum(m.sender)} di *${clan.emblem} ${clan.name}*! (${clan.members.length}/${MAX_MEMBERS} member)`, [m.sender]);
    }
};
