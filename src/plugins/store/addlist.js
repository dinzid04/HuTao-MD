module.exports = {
    name: 'addlist',
    category: 'store',
    commands: ['addlist'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, example, loadLists, saveLists, downloadAndSaveMedia } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!text || !text.includes('|')) return Reply(example("Burger|Burger dengan keju melt"));

        let parts = text.split('|');
        if (parts.length < 2) return Reply(example("Burger|Burger dengan keju melt"));

        const nama = parts[0].trim();
        const deskripsi = parts.slice(1).join('|').trim();

        const chatId = m.chat;
        let listDb = loadLists();

        if (!listDb[chatId]) {
            listDb[chatId] = [];
        }

        const newItem = {
            name: nama,
            desc: deskripsi,
            addedBy: m.sender,
            addedAt: Date.now()
        };

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
                const mediaPath = await downloadAndSaveMedia(mediaMsg, mediaType);
                newItem.image = mediaPath;
                newItem.hasImage = true;
            } catch (e) {
                console.error("Gagal mendownload media addlist:", e);
            }
        }

        listDb[chatId].push(newItem);
        saveLists(listDb);

        Reply(`\`⌜ Item Added ⌟\`\n> ◦ Nama : *${nama}*\n> ◦ Status : *Berhasil Ditambahkan*`);
        return true;
    }
};
