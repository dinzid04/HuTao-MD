module.exports = {
    name: 'translate',
    category: 'ai',
    commands: ['translate', 'tr'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let raw = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!raw || raw.trim().length === 0) {
            return Reply(`\`⌜ AI Translate ⌟\`\n> ◦ *Format :* ${command} teks`);
        }

        let targetLang = 'id';
        let trText = raw.trim();

        if (raw.includes('|')) {
            const parts = raw.split('|');
            targetLang = parts[0].trim().toLowerCase() || 'id';
            trText = parts[1].trim();
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🌐', key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/ai/translate?apikey=${apiKey}&text=${encodeURIComponent(trText)}&to=${targetLang}&from=auto`, { timeout: 25000 });
            const data = res.data?.result;
            if (!data || !data.translated) throw new Error("Gagal menerjemahkan teks.");

            const resultTxt = `\`⌜ AI Translator (${data.from.toUpperCase()} ➔ ${data.to.toUpperCase()}) ⌟\`

${data.translated}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Translate Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
