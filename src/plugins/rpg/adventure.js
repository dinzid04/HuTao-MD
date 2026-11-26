module.exports = {
    name: 'adventure',
    category: 'rpg',
    commands: ['adventure', 'petualang', 'berpetualang'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        await Dinz.sendMessage(m.chat, { react: { text: '🧭', key: m.key } }).catch(() => {});
        const res = HITORI_RPG.adventure(user);
        return Reply(res.message);
    }
};
