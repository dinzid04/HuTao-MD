module.exports = {
    name: 'chord',
    category: 'search',
    commands: ['chord', 'kord'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Chord Gitar ⌟\`\n> ◦ *Format :* ${command} judul_lagu`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎸', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/chord?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.chord) throw new Error("Chord tidak ditemukan.");

            const resultTxt = `\`⌜ Chord & Kunci Gitar ⌟\`
> ◦ *Lagu :* *${data.title || text.trim()}*
> ◦ *Artis :* ${data.artist || '-'}

${data.chord}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Chord Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
