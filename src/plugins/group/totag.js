module.exports = {
    name: 'totag',
    category: 'group',
    commands: ['totag'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.quoted) return Reply('⚠️ Reply pesan yang ingin di-forward tag ke semua member.');
        const meta = await Dinz.groupMetadata(m.chat).catch(() => m.metadata);
        const mentions = (meta?.participants || []).map((p) => p.jid || p.id);
        return Dinz.sendMessage(m.chat, { forward: m.quoted.fakeObj, mentions });
    }
};
