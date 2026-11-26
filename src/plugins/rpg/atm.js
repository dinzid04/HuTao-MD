module.exports = {
    name: 'atm',
    category: 'rpg',
    commands: ['atm', 'bank'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const action = args[0];
        const amount = args[1];
        const res = HITORI_RPG.atm(user, action, amount);
        await Dinz.sendMessage(m.chat, { react: { text: '🏦', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
