module.exports = {
    name: 'snackvideo',
    category: 'downloader',
    commands: ['snackvideo', 'snackdl'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.includes('snackvideo.com')) {
            return Reply(`\`⌜ SnackVideo ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/snackvideo?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.video) throw new Error("Video SnackVideo tidak ditemukan.");

            await Dinz.sendMessage(m.chat, {
                video: { url: data.video },
                caption: `\`⌜ SnackVideo Downloader ⌟\`\n> ◦ *Judul :* ${data.title || 'Snack Video'}\n> ◦ *Author :* ${data.author || '-'}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh SnackVideo: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
