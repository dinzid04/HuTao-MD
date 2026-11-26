module.exports = {
    name: 'setdeskgc',
    category: 'group',
    commands: ['setdeskgc'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        if (!text.trim()) return Reply(`⚠️ Masukkan deskripsi grup baru.`);
        await Dinz.groupUpdateDescription(m.chat, text.trim());
        return Reply('✅ Deskripsi grup berhasil diperbarui.');
    }
};
