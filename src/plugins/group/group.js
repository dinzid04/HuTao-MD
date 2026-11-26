module.exports = {
    name: 'group',
    category: 'group',
    commands: ['group', 'grup'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply, example } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin || "❌ Bot harus menjadi admin grup untuk menggunakan perintah ini.");

        let action = args[0]?.toLowerCase();
        if (action === 'open' || action === 'buka') {
            try {
                await Dinz.groupSettingUpdate(m.chat, 'not_announcement');
                Reply(`\`⌜ Group Settings ⌟\`\n> ◦ Status : *Buka (Open)*\n> ◦ Info : *Semua peserta sekarang dapat mengirim pesan ke grup ini*`);
            } catch (e) {
                Reply(`❌ Gagal membuka grup: ${e.message}`);
            }
        } else if (action === 'close' || action === 'tutup') {
            try {
                await Dinz.groupSettingUpdate(m.chat, 'announcement');
                Reply(`\`⌜ Group Settings ⌟\`\n> ◦ Status : *Tutup (Close)*\n> ◦ Info : *Hanya admin yang dapat mengirim pesan ke grup ini*`);
            } catch (e) {
                Reply(`❌ Gagal menutup grup: ${e.message}`);
            }
        } else {
            Reply(example("open/close"));
        }
        return true;
    }
};
