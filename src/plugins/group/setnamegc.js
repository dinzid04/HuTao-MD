module.exports = {
    name: 'setnamegc',
    category: 'group',
    commands: ['setnamegc'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        if (!text.trim()) return Reply(`⚠️ Masukkan nama grup baru. Contoh: \`${usedPrefix}setnamegc Komunitas HuTao\``);
        await Dinz.groupUpdateSubject(m.chat, text.trim());
        return Reply(`✅ Nama grup berhasil diubah menjadi *${text.trim()}*.`);
    }
};
