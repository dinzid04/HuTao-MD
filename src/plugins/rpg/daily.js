module.exports = {
    name: 'daily',
    category: 'rpg',
    commands: ['daily'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const res = HITORI_RPG.claim(user, 'daily');
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🎁' : '⏳', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
