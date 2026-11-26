module.exports = {
    name: 'bratpink',
    category: 'sticker',
    commands: ['bratpink'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, renderBratCanvas, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("halo"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const buffer = renderBratCanvas(text.trim(), '#ffb6c1', '#000000');
            await Dinz.sendAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('bratpink error:', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat pink: ${e.message}`);
        }
        return true;
    }
};
