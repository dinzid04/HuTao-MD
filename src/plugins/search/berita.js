module.exports = {
    name: 'berita',
    category: 'search',
    commands: ['berita', 'news'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: '📰', key: m.key } }).catch(() => {});

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/news/terkini?apikey=${apiKey}&category=terkini`, { timeout: 30000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Berita tidak ditemukan.");

            let newsList = data.slice(0, 5).map((n, i) => `> *${i + 1}. ${n.title}*\n> ◦ ${n.snippet || n.description || ''}\n> ◦ _Link :_ ${n.link || n.url}`).join('\n\n');
            const resultTxt = `\`⌜ Berita Terkini Indonesia ⌟\`

${newsList}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Berita Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
