module.exports = {
    name: 'twitter',
    category: 'downloader',
    commands: ['twitter', 'twdl', 'x', 'xdl'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || (!targetUrl.includes('twitter.com') && !targetUrl.includes('x.com'))) {
            return Reply(`\`⌜ Twitter / X ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/twitter?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || (!data.video && !data.url && !data.media)) throw new Error("Media Twitter/X tidak ditemukan.");

            const mediaUrl = data.video || data.url || data.media?.[0]?.url;
            await Dinz.sendMessage(m.chat, {
                video: { url: mediaUrl },
                caption: `\`⌜ Twitter / X Video ⌟\`\n> ◦ *Judul :* ${data.title || data.caption || 'Twitter Media'}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Twitter/X: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
