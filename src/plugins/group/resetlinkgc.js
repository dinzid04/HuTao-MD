module.exports = {
    name: 'resetlinkgc',
    category: 'group',
    commands: ['resetlinkgc', 'revoke'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const code = await Dinz.groupRevokeInvite(m.chat);
        return Reply(`♻️ Link grup berhasil direset!\n🔗 Link baru: https://chat.whatsapp.com/${code}`);
    }
};
