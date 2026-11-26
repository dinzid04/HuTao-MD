module.exports = {
    name: 'upgrade',
    category: 'rpg',
    commands: ['upgrade'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const item = (args[0] || '').trim();
        const res = HITORI_RPG.upgrade(user, item);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '✨' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
