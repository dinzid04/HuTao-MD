module.exports = {
    name: 'dya',
    category: 'rpg',
    commands: ['dya'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const res = HITORI_RPG.resolveDuel(m.chat, m.sender, global.db.users, 'dya');
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '⚔️' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message, res.mentions || []);
    }
};
