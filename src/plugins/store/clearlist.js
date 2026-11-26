module.exports = {
    name: 'clearlist',
    category: 'store',
    commands: ['clearlist'],

    async execute(ctx) {
        const { m, isCreator, Reply, loadLists, saveLists, fs } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        const chatId = m.chat;
        const listDb = loadLists();
        const listGrup = listDb[chatId] || [];

        if (listGrup.length === 0) return Reply('❌ Tidak ada item di list untuk dibersihkan.');

        const totalItem = listGrup.length;

        for (const item of listGrup) {
            if (item.hasImage && item.image && fs.existsSync(item.image)) {
                try { fs.unlinkSync(item.image); } catch (e) {}
            }
        }

        delete listDb[chatId];
        saveLists(listDb);

        Reply(`\`⌜ List Cleared ⌟\`\n> ◦ Jumlah : *${totalItem} Item*\n> ◦ Status : *Berhasil Dibersihkan*`);
        return true;
    }
};
