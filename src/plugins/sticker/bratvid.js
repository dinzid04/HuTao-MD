module.exports = {
    name: 'bratvid',
    category: 'sticker',
    commands: ['bratvid', 'bratvideo'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, getBratVidBuffer, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("halo"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const buffer = await getBratVidBuffer(text.trim());
            if (!buffer) throw new Error("Gagal generate brat animasi");
            await Dinz.sendAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error("Bratvid error:", err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat video: ${err.message}`);
        }
        return true;
    }
};
