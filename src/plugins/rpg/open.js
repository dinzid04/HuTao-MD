module.exports = {
    name: 'open',
    category: 'rpg',
    commands: ['open', 'buka'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        if (!args[0] && m.isGroup) return false;
        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const crateType = args[0];
        const count = args[1] || '1';
        const res = HITORI_RPG.openCrate(user, crateType, count);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🎁' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message);
    }
};
