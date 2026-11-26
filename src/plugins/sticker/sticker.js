module.exports = {
    name: 'sticker',
    category: 'sticker',
    commands: ['s', 'stiker', 'sticker', 'sgif'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, mime, qmsg, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isImage = /image/i.test(mime) || m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');
        const isVideo = /video/i.test(mime) || m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage');

        if (!isImage && !isVideo) {
            return Reply(`\`⌜ Stiker Maker ⌟\`\n> ◦ *Format :* reply foto/video dengan ${command}`);
        }

        if (isVideo) {
            const duration = (qmsg.seconds || qmsg.duration || (quoted.msg && quoted.msg.seconds) || (m.msg && m.msg.seconds) || 0);
            if (duration > 15) {
                return Reply("❌ Durasi video terlalu panjang! Maksimal durasi stiker video adalah 10 detik.");
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            let mediaBuffer = null;
            if (typeof qmsg.download === 'function') {
                mediaBuffer = await qmsg.download();
            } else if (typeof quoted.download === 'function') {
                mediaBuffer = await quoted.download();
            } else if (typeof m.download === 'function') {
                mediaBuffer = await m.download();
            } else {
                mediaBuffer = await Dinz.downloadMediaMessage(quoted || m);
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error("Gagal mengunduh media dari pesan.");
            }

            await Dinz.sendAsSticker(m.chat, mediaBuffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('sticker maker error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat stiker: ${err.message}`);
        }
        return true;
    }
};
