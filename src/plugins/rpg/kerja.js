module.exports = {
    name: 'kerja',
    category: 'rpg',
    commands: ['kerja'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const job = (args[0] || '').trim();
        await Dinz.sendMessage(m.chat, { react: { text: '💼', key: m.key } }).catch(() => {});
        const res = HITORI_RPG.kerja(user, job);
        return Reply(res.message);
    }
};
