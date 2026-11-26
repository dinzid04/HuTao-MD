module.exports = {
    name: 'videy',
    category: 'downloader',
    commands: ['videy'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, isPrem, Reply, axios, checkLimit,
            addLimit
        } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.includes('videy.co')) {
            return Reply(`\`⌜ Videy ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/videy?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.videoUrl) throw new Error("Video Videy tidak ditemukan.");

            await Dinz.sendMessage(m.chat, {
                video: { url: data.videoUrl },
                caption: `\`⌜ Videy Downloader ⌟\`\n> ◦ *URL :* ${targetUrl.trim()}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Videy: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
