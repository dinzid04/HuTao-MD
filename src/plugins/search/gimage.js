module.exports = {
    name: 'gimage',
    category: 'search',
    commands: ['gimage', 'googleimage'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Google Image ⌟\`\n> ◦ *Format :* ${command} pencarian`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/gimage?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Gambar tidak ditemukan.");

            const randImg = data[Math.floor(Math.random() * Math.min(data.length, 10))];
            const imgUrl = typeof randImg === 'string' ? randImg : randImg.url || randImg.image;

            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(imgRes.data),
                caption: `\`⌜ Google Image ⌟\`\n> ◦ *Query :* ${text.trim()}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ GImage Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
