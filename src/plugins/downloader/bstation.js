module.exports = {
    name: 'bstation',
    category: 'downloader',
    commands: ['bstation', 'bilibili'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !/(bilibili|b23\.tv|bstar\.tv)/i.test(targetUrl)) {
            return Reply(`\`⌜ Bstation ⌟\`\n> ◦ *Format :* ${command} url\n> ◦ *Contoh :* ${command} https://www.bilibili.tv/id/video/xxxx`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/bstation?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 60000 });
            if (res.data && res.data.status === false) {
                throw new Error(res.data.error || res.data.message || "Video Bstation tidak ditemukan.");
            }
            const data = res.data?.result;
            if (!data || (!data.video && !data.download && !data.video_url)) throw new Error("Video Bstation tidak ditemukan.");

            const videoUrl = data.video || data.download || data.video_url;
            await Dinz.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `\`⌜ Bstation Anime ⌟\`\n> ◦ *Judul :* ${data.title || 'Bstation Video'}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Bstation: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
