module.exports = {
    name: 'threads',
    category: 'downloader',
    commands: ['threads', 'threadsdl'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.includes('threads.net')) {
            return Reply(`\`⌜ Threads ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/threads?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || (!data.video_urls?.length && !data.image_urls?.length && !data.download)) {
                throw new Error("Konten Threads tidak ditemukan.");
            }

            const videoUrl = data.video_urls?.[0]?.download_url || (typeof data.download === 'string' && data.download.includes('.mp4') ? data.download : null);
            const imageUrl = data.image_urls?.[0] || data.download;

            if (videoUrl) {
                await Dinz.sendMessage(m.chat, {
                    video: { url: videoUrl },
                    caption: `\`⌜ Threads Video ⌟\`\n> ◦ *Author :* ${data.user?.username || '-'}\n> ◦ *Caption :* ${data.caption || '-'}`,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else if (imageUrl) {
                await Dinz.sendMessage(m.chat, {
                    image: { url: imageUrl },
                    caption: `\`⌜ Threads Image ⌟\`\n> ◦ *Author :* ${data.user?.username || '-'}\n> ◦ *Caption :* ${data.caption || '-'}`
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Threads: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
