module.exports = {
    name: 'jodohnama',
    category: 'primbon',
    commands: ['jodohnama', 'kecocokannama'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || !text.includes('|')) return Reply(example("Dinz | Siti"));

        const parts = text.split('|').map(s => s.trim());
        if (parts.length < 2 || !parts[0] || !parts[1]) return Reply(example("Dinz | Siti"));

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.kecocokanNama(parts[0], parts[1]);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal meramal kecocokan nama: ${e.message}`);
        }
        return true;
    }
};
