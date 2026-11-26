module.exports = {
    name: 'surah',
    category: 'islami',
    commands: ['surah', 'surat'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, ISLAMIC_ENGINE } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let surahNum = parseInt(text) || 1;
        if (surahNum < 1 || surahNum > 114) surahNum = 1;

        await Dinz.sendMessage(m.chat, { react: { text: "📖", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getQuran(surahNum);
        addLimit(m.sender, isCreator);
        return Reply(res.message);
    }
};
