module.exports = {
    name: 'tovn',
    category: 'tools',
    commands: ['tovn', 'toptt'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            toPTT
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const targetType = (quoted && quoted.type) || (m.quoted && m.quoted.type) || m.type || '';
        const isVideo = /video/i.test(mime) || /video/i.test(targetType);
        const isAudio = /audio/i.test(mime) || /audio/i.test(targetType);

        if (!isVideo && !isAudio) return Reply(example("audio atau video untuk diubah ke VN"));

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

            const pttBuffer = await toPTT(buffer, isVideo ? 'mp4' : 'mp3');
            await Dinz.sendMessage(m.chat, {
                audio: pttBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengubah ke VN: ${e.message}`);
        }
        return true;
    }
};
