module.exports = {
    name: 'tomp3',
    category: 'tools',
    commands: ['tomp3', 'toaudio'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            toAudio
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const targetType = (quoted && quoted.type) || (m.quoted && m.quoted.type) || m.type || '';
        const isVideo = /video/i.test(mime) || /video/i.test(targetType);
        const isAudio = /audio/i.test(mime) || /audio/i.test(targetType);

        if (!isVideo && !isAudio) return Reply(example("video atau audio"));

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

            const audioBuffer = await toAudio(buffer, isVideo ? 'mp4' : 'ogg');
            await Dinz.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengubah ke MP3: ${e.message}`);
        }
        return true;
    }
};
