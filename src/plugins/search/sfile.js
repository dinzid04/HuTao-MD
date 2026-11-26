module.exports = {
    name: 'sfile',
    category: 'search',
    commands: ['sfile', 'sfilesearch'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Sfile ⌟\`\n> ◦ *Format :* ${command} query`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '📁', key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/sfile?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 30000 });
            const data = res.data?.result;
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("File tidak ditemukan.");

            let listTxt = data.slice(0, 5).map((f, i) => `> *${i + 1}. ${f.name || f.filename}*\n> ◦ Ukuran: ${f.size || '-'}\n> ◦ Link: ${f.url || f.link}`).join('\n\n');
            const resultTxt = `\`⌜ Sfile.mobi Search ⌟\`
> ◦ *Query :* ${text.trim()}

${listTxt}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Sfile Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
