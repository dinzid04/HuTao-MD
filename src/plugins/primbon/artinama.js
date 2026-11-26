module.exports = {
    name: 'artinama',
    category: 'primbon',
    commands: ['artinama'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("Dinz"));

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.artiNama(text.trim());
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil arti nama: ${e.message}`);
        }
        return true;
    }
};
