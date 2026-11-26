module.exports = {
    name: 'shio',
    category: 'primbon',
    commands: ['shio', 'ramalanshio'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("2000"));

        const year = text.trim().replace(/[^0-9]/g, '');
        if (!year || isNaN(year)) return Reply(example("2000"));

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.ramalanShio(year);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil ramalan shio: ${e.message}`);
        }
        return true;
    }
};
