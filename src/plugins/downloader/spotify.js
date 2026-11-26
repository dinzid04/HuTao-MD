module.exports = {
    name: 'spotify',
    category: 'downloader',
    commands: ['spotify', 'spotdl', 'spotifydl'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit,
            downloadSpotify
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!targetUrl || targetUrl.trim().length === 0) {
            return Reply(example("https://open.spotify.com/track/3JkDuxcnIzBUngCk6peKZi..."));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const result = await downloadSpotify(targetUrl);
            const captionText = `\`⌜ Spotify Downloader ⌟\`\n> ◦ *Judul :* ${result.title || 'Spotify Track'}\n> ◦ *Artis :* ${result.artist || 'Unknown Artist'}\n> ◦ *Durasi :* ${result.duration || '-'}`;

            if (result.image) {
                try {
                    await Dinz.sendMessage(m.chat, {
                        image: { url: result.image },
                        caption: captionText
                    }, { quoted: m });
                } catch (imgErr) {}
            }

            if (result.buffer) {
                await Dinz.sendMessage(m.chat, {
                    audio: result.buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${result.title || 'spotify'}.mp3`
                }, { quoted: m });
            } else if (result.download) {
                await Dinz.sendMessage(m.chat, {
                    audio: { url: result.download },
                    mimetype: 'audio/mpeg',
                    fileName: `${result.title || 'spotify'}.mp3`
                }, { quoted: m });
            } else {
                throw new Error("Gagal memuat audio Spotify.");
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Spotify dl error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mengunduh Spotify: ${err?.message || err}`);
        }
        return true;
    }
};
