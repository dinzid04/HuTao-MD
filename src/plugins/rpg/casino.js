module.exports = {
    name: 'casino',
    category: 'rpg',
    commands: ['casino', 'judi'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const amount = args[0];
        const res = HITORI_RPG.casino(user, amount);
        await Dinz.sendMessage(m.chat, { react: { text: '🎰', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
