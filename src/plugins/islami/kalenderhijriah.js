module.exports = {
    name: 'kalenderhijriah',
    category: 'islami',
    commands: ['kalenderhijriah', 'hijriah', 'tglhijriah'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, ISLAMIC_ENGINE } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: "📅", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getKalenderHijriah();
        addLimit(m.sender, isCreator);
        return Reply(res.message);
    }
};
