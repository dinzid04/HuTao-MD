module.exports = {
    name: 'doaharian',
    category: 'islami',
    commands: ['doaharian', 'doa'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, ISLAMIC_ENGINE } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let query = text ? text.trim() : '';

        await Dinz.sendMessage(m.chat, { react: { text: "🤲", key: m.key } }).catch(() => {});
        const res = ISLAMIC_ENGINE.getDoaHarian(query);
        addLimit(m.sender, isCreator);
        return Reply(res.message);
    }
};
