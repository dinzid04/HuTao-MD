module.exports = {
    name: 'level',
    category: 'rpg',
    commands: ['level', 'levelup'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, HITORI_RPG, isPremiumUser } = ctx;

        const user = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const res = HITORI_RPG.levelup(user, m.sender);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '🎉' : '📊', key: m.key } }).catch(() => {});

        let ppUrl = '';
        try {
            ppUrl = await Dinz.profilePictureUrl(m.sender, 'image').catch(() => '');
        } catch (_) {}

        const statusIcon = isCreator ? 'OWNER' : (isPremiumUser(m.sender) ? 'PREMIUM' : 'MEMBER');
        const userId = String(m.sender || '').split('@')[0].split(':')[0];
        const cardBuffer = await HITORI_RPG.renderLevelCard(user, m.pushName, res.beforeLevel, res.isLevelUp, ppUrl, statusIcon, userId, { moneyBonus: res.moneyBonus || 0 });
        if (cardBuffer && Buffer.isBuffer(cardBuffer)) {
            return Dinz.sendMessage(m.chat, {
                image: cardBuffer,
                caption: res.message,
                contextInfo: { mentionedJid: [m.sender] }
            }, { quoted: m });
        } else {
            return Reply(res.message, [m.sender]);
        }
        return true;
    }
};
