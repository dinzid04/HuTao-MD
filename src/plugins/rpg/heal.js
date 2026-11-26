module.exports = {
    name: 'heal',
    category: 'rpg',
    commands: ['heal'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const count = args[0] || '';
        const res = HITORI_RPG.heal(user, count);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '❤️' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
