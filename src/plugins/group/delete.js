module.exports = {
    name: 'delete',
    category: 'group',
    commands: ['delete', 'del'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply } = ctx;

        if (!m.quoted) return Reply('⚠️ Reply pesan yang ingin dihapus.');
        if (m.isGroup && !m.quoted.fromMe && !m.isAdmin && !isCreator) return Reply(global.mess.admin);
        try {
            await Dinz.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id,
                    participant: m.quoted.sender
                }
            });
        } catch (e) {
            return Reply(`❌ Gagal menghapus pesan: ${e.message}`);
        }
        return true;
    }
};
