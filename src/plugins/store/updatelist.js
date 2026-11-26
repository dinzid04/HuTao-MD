module.exports = {
    name: 'updatelist',
    category: 'store',
    commands: ['updatelist'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, example, loadLists, saveLists, downloadAndSaveMedia, fs } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!text || !text.includes('|')) return Reply(example("Burger|Dengan daging wagyu"));

        let parts = text.split('|');
        if (parts.length < 2) return Reply(example("Burger|Dengan daging wagyu"));

        const keyword = parts[0].trim();
        const deskripsiBaru = parts.slice(1).join('|').trim();

        const chatId = m.chat;
        const listDb = loadLists();
        let listGrup = listDb[chatId] || [];

        if (listGrup.length === 0) return Reply("❌ Tidak ada item di list");

        let itemIndex = listGrup.findIndex(item =>
            item.name.toLowerCase() === keyword.toLowerCase() ||
            item.name.toLowerCase().includes(keyword.toLowerCase())
        );

        if (itemIndex === -1) return Reply(`❌ Item "${keyword}" tidak ditemukan`);

        const itemLama = listGrup[itemIndex];
        listGrup[itemIndex].desc = deskripsiBaru;

        let mediaMsg = null;
        let mediaType = '';

        if (m.type === 'imageMessage') { mediaMsg = m; mediaType = 'image'; }
        else if (m.type === 'videoMessage') { mediaMsg = m; mediaType = 'video'; }
        else if (m.type === 'audioMessage') { mediaMsg = m; mediaType = 'audio'; }
        else if (m.type === 'stickerMessage') { mediaMsg = m; mediaType = 'sticker'; }
        else if (m.quoted) {
            if (m.quoted.type === 'imageMessage') { mediaMsg = m.quoted; mediaType = 'image'; }
            else if (m.quoted.type === 'videoMessage') { mediaMsg = m.quoted; mediaType = 'video'; }
            else if (m.quoted.type === 'audioMessage') { mediaMsg = m.quoted; mediaType = 'audio'; }
            else if (m.quoted.type === 'stickerMessage') { mediaMsg = m.quoted; mediaType = 'sticker'; }
        }

        if (mediaMsg) {
            try {
                if (itemLama.hasImage && itemLama.image && fs.existsSync(itemLama.image)) {
                    fs.unlinkSync(itemLama.image);
                }
                const mediaPath = await downloadAndSaveMedia(mediaMsg, mediaType);
                listGrup[itemIndex].image = mediaPath;
                listGrup[itemIndex].hasImage = true;
            } catch (e) {}
        }

        listDb[chatId] = listGrup;
        saveLists(listDb);

        Reply(`\`⌜ Item Updated ⌟\`\n> ◦ Nama : *${itemLama.name}*\n> ◦ Status : *Berhasil Diperbarui*`);
        return true;
    }
};
