module.exports = {
    name: 'kolam',
    category: 'rpg',
    commands: ['kolam'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        await Dinz.sendMessage(m.chat, { react: { text: '🐟', key: m.key } }).catch(() => {});
        const textMsg = HITORI_RPG.getKolam(user);
        return Reply(textMsg);
    }
};
