module.exports = {
    name: 'slot',
    category: 'rpg',
    commands: ['slot', 'slots'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const amount = args[0] || '10';
        const res = HITORI_RPG.slot(user, amount);
        await Dinz.sendMessage(m.chat, { react: { text: '🎰', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
