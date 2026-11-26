module.exports = {
    name: 'merampok',
    category: 'rpg',
    commands: ['merampok', 'rob'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (!targetJid) return Reply(`📌 *Contoh:* merampok @user`);
        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const targetUser = global.db.users[targetJid] || (global.db.users[targetJid] = {});
        const targetName = await Dinz.getName(targetJid) || 'Target';
        const res = HITORI_RPG.merampok(user, targetUser, targetName);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🥷' : '❌', key: m.key } }).catch(() => {});
        if (res.success) {
            return Reply(res.message);
        }
        return Reply(res.message);
    }
};
