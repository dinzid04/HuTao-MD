module.exports = {
    name: 'dno',
    category: 'rpg',
    commands: ['dno'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const res = HITORI_RPG.resolveDuel(m.chat, m.sender, global.db.users, 'dno');
        await Dinz.sendMessage(m.chat, { react: { text: '🏳️', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
