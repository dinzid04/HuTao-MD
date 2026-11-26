module.exports = {
    name: 'jadwalsholat',
    category: 'islami',
    commands: ['jadwalsholat', 'sholat', 'waktusholat'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, ISLAMIC_ENGINE } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let city = text ? text.trim() : 'jakarta';

        await Dinz.sendMessage(m.chat, { react: { text: "🕌", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getJadwalSholat(city);
        addLimit(m.sender, isCreator);
        return Reply(res.message);
    }
};
