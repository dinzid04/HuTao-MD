module.exports = {
    name: 'toimg',
    category: 'tools',
    commands: ['toimg', 'toimage', 'tophoto'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            toImage
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const targetType = (quoted && quoted.type) || (m.quoted && m.quoted.type) || m.type || '';
        const isSticker = /webp/i.test(mime) || /sticker/i.test(targetType);
        if (!isSticker) return Reply(example("stiker (Reply stiker yang ingin diubah ke foto)"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            let buffer = null;
            if (typeof qmsg?.download === 'function') {
                buffer = await qmsg.download();
            } else if (m.quoted && typeof m.quoted.download === 'function') {
                buffer = await m.quoted.download();
            } else if (quoted && typeof quoted.download === 'function') {
                buffer = await quoted.download();
            } else if (typeof m.download === 'function') {
                buffer = await m.download();
            } else if (typeof Dinz.downloadMediaMessage === 'function') {
                buffer = await Dinz.downloadMediaMessage(m.quoted || quoted || m);
            }

            if (!buffer) throw new Error("Gagal mengunduh stiker.");

            const pngBuffer = await toImage(buffer);
            await Dinz.sendMessage(m.chat, {
                image: pngBuffer,
                caption: `\`⌜ Sticker To Image ⌟\`\n> ◦ *Status :* Berhasil diubah ke foto`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengubah stiker ke foto: ${e.message}`);
        }
        return true;
    }
};
