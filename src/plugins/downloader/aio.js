module.exports = {
    name: 'aio',
    category: 'downloader',
    commands: ['aio', 'allinone', 'aiodl'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.startsWith('http')) {
            return Reply(`\`⌜ All In One Downloader ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/aio?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 90000 });
            const data = res.data?.result;
            if (!data || !data.medias || data.medias.length === 0) {
                throw new Error("Media tidak ditemukan.");
            }

            const captionTxt = `\`⌜ All In One Downloader ⌟\`\n> ◦ *Sumber :* ${(data.source || 'Social Media').toUpperCase()}\n> ◦ *Judul :* ${data.title || 'Media Download'}`;

            const firstMedia = data.medias[0];
            if (firstMedia.type === 'video' || (firstMedia.url && firstMedia.url.includes('.mp4'))) {
                await Dinz.sendMessage(m.chat, {
                    video: { url: firstMedia.url },
                    caption: captionTxt,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else if (firstMedia.type === 'audio' || (firstMedia.url && firstMedia.url.includes('.mp3'))) {
                await Dinz.sendMessage(m.chat, {
                    audio: { url: firstMedia.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${data.title || 'audio'}.mp3`
                }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, {
                    image: { url: firstMedia.url },
                    caption: captionTxt
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh AIO: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
