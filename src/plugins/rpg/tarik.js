module.exports = {
    name: 'tarik',
    category: 'rpg',
    commands: ['tarik', 'withdraw'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const amount = args[0] || 'all';
        const res = HITORI_RPG.atm(user, 'tarik', amount);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🏧' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
