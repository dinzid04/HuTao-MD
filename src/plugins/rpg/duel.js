module.exports = {
    name: 'duel',
    category: 'rpg',
    commands: ['duel'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (!targetJid) return Reply(`📌 *Contoh:* duel @user`);
        const res = HITORI_RPG.createDuel(m.chat, m.sender, targetJid);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '⚔️' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message, [targetJid, m.sender]);
    }
};
