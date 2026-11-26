module.exports = {
    name: 'anime',
    category: 'search',
    commands: ['anime', 'animesearch'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Anime Search ⌟\`\n> ◦ *Format :* ${command} judul_anime`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🌸', key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/anime?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 30000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Anime tidak ditemukan.");

            const ani = data[0];
            const captionTxt = `\`⌜ Anime Info ⌟\`
> ◦ *Judul :* *${ani.title || ani.name}*
> ◦ *Tipe :* ${ani.type || '-'}
> ◦ *Episode :* ${ani.episodes || '-'}
> ◦ *Score :* ⭐ ${ani.score || '-'}
> ◦ *Status :* ${ani.status || '-'}
> ◦ *Sinopsis :* ${ani.synopsis ? ani.synopsis.slice(0, 200) + '...' : '-'}`;

            if (ani.image || ani.thumbnail) {
                try {
                    const imgRes = await axios.get(ani.image || ani.thumbnail, { responseType: 'arraybuffer', timeout: 25000 });
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
            Reply(`❌ Anime Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
