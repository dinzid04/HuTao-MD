module.exports = {
    name: 'shop',
    category: 'rpg',
    commands: ['shop', 'pasar'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const action = args[0];
        const item = args[1];
        const count = args[2] || '1';
        const res = HITORI_RPG.shop(user, action, item, count);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🛒' : '🏪', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
