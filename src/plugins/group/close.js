module.exports = {
    name: 'close',
    category: 'group',
    commands: ['close', 'tutup'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin || "❌ Bot harus menjadi admin grup untuk menggunakan perintah ini.");

        try {
            await Dinz.groupSettingUpdate(m.chat, 'announcement');
            Reply(`\`⌜ Group Settings ⌟\`\n> ◦ Status : *Tutup (Close)*\n> ◦ Info : *Hanya admin yang dapat mengirim pesan ke grup ini*`);
        } catch (e) {
            Reply(`❌ Gagal menutup grup: ${e.message}`);
        }
        return true;
    }
};
