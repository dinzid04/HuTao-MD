module.exports = {
    name: 'togif',
    category: 'tools',
    commands: ['togif'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            toVideo, toVideoFromSticker
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const targetType = (quoted && quoted.type) || (m.quoted && m.quoted.type) || m.type || '';
        const isSticker = /webp/i.test(mime) || /sticker/i.test(targetType);
        const isVideo = /video|gif/i.test(mime) || /video/i.test(targetType);

        if (!isSticker && !isVideo) return Reply(example("stiker bergerak atau video pendek"));

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

            if (!buffer) throw new Error("Gagal mengunduh media.");

            const vidBuffer = isSticker ? await toVideoFromSticker(buffer) : await toVideo(buffer, 'mp4');
            await Dinz.sendMessage(m.chat, {
                video: vidBuffer,
                gifPlayback: true,
                mimetype: 'video/mp4',
                caption: `\`⌜ Sticker To GIF ⌟\`\n> ◦ *Status :* Berhasil diubah ke animasi GIF`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengubah ke GIF: ${e.message}`);
        }
        return true;
    }
};
