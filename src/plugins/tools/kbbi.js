module.exports = {
    name: 'kbbi',
    category: 'tools',
    commands: ['kbbi'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ KBBI Online ⌟\`\n> ◦ *Format :* ${command} <kata>\n> ◦ *Contoh :* ${command} integritas`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "📖", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/kbbi?apikey=${apiKey}&kata=${encodeURIComponent(text.trim())}`);
            const data = res.data?.result;
            if (!data || !data.arti) throw new Error(`Kata '${text.trim()}' tidak ditemukan di KBBI.`);

            const artiList = Array.isArray(data.arti) ? data.arti.map((a, i) => `> ${i + 1}. ${a}`).join('\n') : `> ${data.arti}`;
            const resultTxt = `\`⌜ Kamus Besar Bahasa Indonesia ⌟\`
> ◦ *Kata :* *${data.kata || text.trim()}*

${artiList}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
