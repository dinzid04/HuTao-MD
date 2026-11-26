module.exports = {
    name: 'bratgambar',
    category: 'sticker',
    commands: ['bratgambar', 'bratimg'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, getBratBuffer, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("halo"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const buffer = await getBratBuffer(text.trim());
            if (!buffer) throw new Error("Gagal generate brat");
            await Dinz.sendAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('bratgambar error:', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat: ${e.message}`);
        }
        return true;
    }
};
