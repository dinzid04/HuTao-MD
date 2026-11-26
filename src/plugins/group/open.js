module.exports = {
    name: 'open',
    category: 'group',
    commands: ['open', 'buka'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin || "❌ Bot harus menjadi admin grup untuk menggunakan perintah ini.");

        try {
            await Dinz.groupSettingUpdate(m.chat, 'not_announcement');
            Reply(`\`⌜ Group Settings ⌟\`\n> ◦ Status : *Buka (Open)*\n> ◦ Info : *Semua peserta sekarang dapat mengirim pesan ke grup ini*`);
        } catch (e) {
            Reply(`❌ Gagal membuka grup: ${e.message}`);
        }
        return true;
    }
};
