module.exports = {
    name: 'brathd',
    category: 'sticker',
    commands: ['brathd', 'bratgambarhd'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, renderBratHD, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("halo"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const buffer = renderBratHD(text.trim());
            await Dinz.sendAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('brathd error:', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat hd: ${e.message}`);
        }
        return true;
    }
};
