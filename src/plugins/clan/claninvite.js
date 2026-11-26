const { cleanNum, getUser } = require('./_helper');

module.exports = {
    name: 'claninvite',
    category: 'clan',
    commands: ['claninvite'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx, usedPrefix } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const invites = botCtx.getSection('clan_invites', Dinz) || {};
        const saveInvites = () => botCtx.setSection('clan_invites', invites, Dinz);
        const user = getUser(m.sender);

        if (!user.clanId || !clans[user.clanId]) return Reply('❌ Kamu belum bergabung di clan mana pun.');
        const clan = clans[user.clanId];
        if (clan.leader !== m.sender) return Reply('❌ Hanya Leader clan yang bisa mengundang member.');
        const target = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!target) return Reply(`⚠️ Tag atau reply user yang ingin diundang. Contoh: \`${usedPrefix}claninvite @user\``);
        if (clan.members.includes(target)) return Reply('❌ User tersebut sudah menjadi member clan kamu.');
        invites[target] = { clanId: clan.id, invitedBy: m.sender, ts: Date.now() };
        saveInvites();
        return Reply(`📨 @${cleanNum(target)} diundang bergabung ke *${clan.emblem} ${clan.name}*!\nKetik \`${usedPrefix}clanjoin ${clan.id}\` untuk menerima.`, [target]);
    }
};
