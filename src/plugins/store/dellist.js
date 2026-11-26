module.exports = {
    name: 'dellist',
    category: 'store',
    commands: ['dellist'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, example, loadLists, saveLists, fs } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!text) return Reply(example("Burger"));

        const chatId = m.chat;
        const listDb = loadLists();
        let listGrup = listDb[chatId] || [];

        if (listGrup.length === 0) return Reply("❌ Tidak ada item di list");

        let itemDihapus = null;
        let index = -1;

        if (!isNaN(text)) {
            index = parseInt(text) - 1;
            if (index >= 0 && index < listGrup.length) {
                itemDihapus = listGrup[index];
            }
        } else {
            const keyword = text.toLowerCase();
            index = listGrup.findIndex(item =>
                item.name.toLowerCase() === keyword ||
                item.name.toLowerCase().includes(keyword)
            );
            if (index !== -1) {
                itemDihapus = listGrup[index];
            }
        }

        if (!itemDihapus) return Reply(`❌ Item "${text}" tidak ditemukan`);

        if (itemDihapus.hasImage && itemDihapus.image && fs.existsSync(itemDihapus.image)) {
            try {
                fs.unlinkSync(itemDihapus.image);
            } catch (e) {}
        }

        listGrup.splice(index, 1);
        listDb[chatId] = listGrup;
        saveLists(listDb);

        Reply(`\`⌜ Item Deleted ⌟\`\n> ◦ Nama : *${itemDihapus.name}*\n> ◦ Status : *Berhasil Dihapus*`);
        return true;
    }
};
