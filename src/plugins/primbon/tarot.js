module.exports = {
    name: 'tarot',
    category: 'primbon',
    commands: ['tarot', 'kartutarot'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.tarotReading();
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membaca kartu tarot: ${e.message}`);
        }
        return true;
    }
};
