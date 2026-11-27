const stickerAudio = require('../../services/sticker-audio');

module.exports = {
    name: 'swm',
    category: 'sticker',
    commands: ['swm', 'wm', 'take', 'colong'],

    async execute(ctx) {
        const { Dinz, m, store, botCtx, command, text, quoted, mime, qmsg, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isSticker = /webp/i.test(mime)
            || m.type === 'stickerMessage'
            || m.type === 'audioStickerMessage'
            || (m.quoted && (m.quoted.type === 'stickerMessage' || m.quoted.type === 'audioStickerMessage'));
        const isImage = /image/i.test(mime) || m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');
        const isVideo = /video/i.test(mime) || m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage');

        if (!isSticker && !isImage && !isVideo) {
            return Reply(`\`⌜ Stiker Watermark ⌟\`\n> ◦ *Format :* reply stiker dengan ${command} pack|author`);
        }

        if (isVideo) {
            const duration = (qmsg.seconds || qmsg.duration || (quoted.msg && quoted.msg.seconds) || (m.msg && m.msg.seconds) || 0);
            if (duration > 15) {
                return Reply("❌ Durasi video terlalu panjang! Maksimal durasi stiker video adalah 10 detik.");
            }
        }

        const identity = botCtx && typeof botCtx.getBotIdentity === 'function' ? botCtx.getBotIdentity(Dinz) : {};
        let pack = identity.packname || global.packname;
        let aut = identity.namaOwner || global.namaOwner || global.author;

        if (text && text.trim().length > 0) {
            if (text.includes('|')) {
                const parts = text.split('|');
                pack = parts[0].trim() || pack;
                aut = parts[1].trim() || aut;
            } else {
                pack = text.trim();
                aut = text.trim();
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

            // Jika stiker yang di-reply adalah Sticker Audio, pertahankan audionya sambil mengganti WM!
            if (isSticker) {
                const foundAudio = await stickerAudio.findAudioForQuotedSticker(m, store).catch(() => null);
                if (foundAudio && Buffer.isBuffer(foundAudio.audioBuf) && foundAudio.audioBuf.length > 64) {
                    await stickerAudio.sendStickerAudio(Dinz, m.chat, foundAudio.audioBuf, mediaBuffer, {
                        packname: pack,
                        author: aut,
                        maxAudioDuration: 20
                    });
                    addLimit(m.sender, isCreator);
                    await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
                    return true;
                }
            }

            await Dinz.sendAsSticker(m.chat, mediaBuffer, m, { packname: pack, author: aut });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('swm error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengubah watermark stiker: ${err.message}`);
        }
        return true;
    }
};
