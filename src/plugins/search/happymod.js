module.exports = {
    name: 'happymod',
    category: 'search',
    commands: ['happymod'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ HappyMod ⌟\`\n> ◦ *Format :* ${command} nama_game`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '👾', key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/happymod?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 30000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("MOD tidak ditemukan.");

            const mod = data[0];
            const captionTxt = `\`⌜ HappyMod APK ⌟\`
> ◦ *Nama :* *${mod.title || mod.name}*
> ◦ *Rating :* ⭐ ${mod.rating || '-'}
> ◦ *Link :* ${mod.url || mod.link || '-'}`;

            if (mod.icon || mod.thumbnail) {
                try {
                    const imgRes = await axios.get(mod.icon || mod.thumbnail, { responseType: 'arraybuffer', timeout: 25000 });
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
            Reply(`❌ HappyMod Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
