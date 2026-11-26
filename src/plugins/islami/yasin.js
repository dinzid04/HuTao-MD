module.exports = {
    name: 'yasin',
    category: 'islami',
    commands: ['yasin', 'surahyasin'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, ISLAMIC_ENGINE } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: "📖", key: m.key } }).catch(() => {});
        const res = ISLAMIC_ENGINE.getYasin();
        addLimit(m.sender, isCreator);
        return Reply(res.message);
    }
};
