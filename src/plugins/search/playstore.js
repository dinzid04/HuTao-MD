module.exports = {
    name: 'playstore',
    category: 'search',
    commands: ['playstore', 'ps'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Play Store ⌟\`\n> ◦ *Format :* ${command} nama_aplikasi`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '📲', key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/playstore?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 30000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Aplikasi tidak ditemukan.");

            const app = data[0];
            const captionTxt = `\`⌜ Google Play Store ⌟\`
> ◦ *Nama :* *${app.title || app.name}*
> ◦ *Developer :* ${app.developer || '-'}
> ◦ *Rating :* ⭐ ${app.rating || app.scoreText || '-'}
> ◦ *Link :* ${app.url || app.link || '-'}`;

            if (app.icon || app.thumbnail) {
                try {
                    const imgRes = await axios.get(app.icon || app.thumbnail, { responseType: 'arraybuffer', timeout: 25000 });
                    await Dinz.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: captionTxt }, { quoted: m });
                } catch (eImg) {
                    await Reply(captionTxt);
                }
            } else {
                await Reply(captionTxt);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ PlayStore Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
