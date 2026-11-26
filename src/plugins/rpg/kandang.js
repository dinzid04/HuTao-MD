module.exports = {
    name: 'kandang',
    category: 'rpg',
    commands: ['kandang'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        await Dinz.sendMessage(m.chat, { react: { text: '🐂', key: m.key } }).catch(() => {});
        const textMsg = HITORI_RPG.getKandang(user);
        return Reply(textMsg);
    }
};
