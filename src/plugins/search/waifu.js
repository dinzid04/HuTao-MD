module.exports = {
    name: 'waifu',
    category: 'search',
    commands: ['waifu'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: '🌸', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/random/waifu?apikey=${apiKey}`, { timeout: 35000 });
            const data = res.data?.result || res.data;
            const wUrl = data.url || data.image;
            if (!wUrl) throw new Error("Gagal mengambil gambar waifu.");

            const imgRes = await axios.get(wUrl, { responseType: 'arraybuffer', timeout: 30000 });
            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(imgRes.data),
                caption: `\`⌜ Random Anime Waifu ⌟\`\n> ◦ *Status :* Sukses`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Waifu Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
