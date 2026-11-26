module.exports = {
    name: 'mulung',
    category: 'rpg',
    commands: ['mulung'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        await Dinz.sendMessage(m.chat, { react: { text: '🗑️', key: m.key } }).catch(() => {});
        const res = HITORI_RPG.mulung(user);
        return Reply(res.message);
    }
};
