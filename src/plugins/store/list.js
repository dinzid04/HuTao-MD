module.exports = {
    name: 'list',
    category: 'store',
    commands: ['list'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, Reply, loadLists, loadListSettings, getListWithTemplate, fs } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);

        const chatId = m.chat;
        const listDb = loadLists();
        const listGrup = listDb[chatId] || [];

        let currentPrefix = '';
        if (listGrup.length === 0) {
            return Reply(
                `\`⌜ List Store ⌟\`\n> ◦ Status : *Belum ada item*\n> ◦ Tambah : *${currentPrefix}addlist nama|deskripsi*`
            )
        }

        try {
            const groupMetadata = m.isGroup ? await Dinz.groupMetadata(chatId) : null;
            const groupName = groupMetadata ? groupMetadata.subject : 'Grup Ini';
            const userName = m.pushName || m.sender.split('@')[0];

            const listText = getListWithTemplate(chatId, userName, groupName, listGrup);

            const settings = loadListSettings();
            const chatSettings = settings[chatId];

            if (chatSettings && chatSettings.media && fs.existsSync(chatSettings.media)) {
                await Dinz.sendMessage(chatId, {
                    image: fs.readFileSync(chatSettings.media),
                    caption: listText
                }, { quoted: m });
            } else {
                await Dinz.sendMessage(chatId, {
                    text: listText
                }, { quoted: m });
            }

        } catch (e) {
            Reply(global.mess.error);
        }
        return true;
    }
};
