module.exports = {
    name: 'inventory',
    category: 'rpg',
    commands: ['inventory', 'inv', 'bal', 'balance', 'money'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, HITORI_RPG } = ctx;

        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : m.sender);
        const targetUser = global.db.users[targetJid] || (global.db.users[targetJid] = {});
        const pushName = targetJid === m.sender ? m.pushName : (await Dinz.getName(targetJid) || 'Player');
        const textResult = HITORI_RPG.getInventory(targetUser, pushName);
        await Dinz.sendMessage(m.chat, { react: { text: '🎒', key: m.key } }).catch(() => {});
        return Reply(textResult, [targetJid]);
    }
};
