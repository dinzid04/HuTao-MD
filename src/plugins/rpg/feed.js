module.exports = {
    name: 'feed',
    category: 'rpg',
    commands: ['feed', 'feedpet'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const type = args[0];
        const res = HITORI_RPG.feed(user, type);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🍖' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
