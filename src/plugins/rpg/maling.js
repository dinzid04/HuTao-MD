module.exports = {
    name: 'maling',
    category: 'rpg',
    commands: ['maling'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const res = HITORI_RPG.maling(user);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🏦' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
