module.exports = {
    name: 'soundcloud',
    category: 'downloader',
    commands: ['soundcloud', 'scplay'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ SoundCloud ⌟\`\n> ◦ *Format :* ${command} judul_lagu`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎧', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/soundcloudplay?apikey=${apiKey}&query=${encodeURIComponent(text.trim())}`, { timeout: 45000 });
            const data = res.data?.result;
            if (!data || (!data.audio && !data.download && !data.url)) throw new Error("Lagu SoundCloud tidak ditemukan.");

            const audioUrl = data.audio || data.download || data.url;
            const captionTxt = `\`⌜ SoundCloud Track ⌟\`
> ◦ *Judul :* ${data.title || text.trim()}
> ◦ *Artis :* ${data.artist || data.author || '-'}`;

            if (data.thumbnail || data.image) {
                try {
                    await Dinz.sendMessage(m.chat, { image: { url: data.thumbnail || data.image }, caption: captionTxt }, { quoted: m });
                } catch (eImg) {}
            }

            const aRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 45000 });
            await Dinz.sendMessage(m.chat, {
                audio: Buffer.from(aRes.data),
                mimetype: 'audio/mpeg',
                fileName: `${data.title || 'soundcloud'}.mp3`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal memutar SoundCloud: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
