module.exports = {
    name: 'bratgura',
    category: 'sticker',
    commands: ['bratgura'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, renderBratGura, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("halo gura"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const buffer = await renderBratGura(text.trim());
            await Dinz.sendAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('bratgura error:', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat gura: ${e.message}`);
        }
        return true;
    }
};
