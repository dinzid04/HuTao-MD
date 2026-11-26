module.exports = {
    name: 'profile',
    category: 'rpg',
    commands: ['profile', 'me', 'my', 'profil'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, HITORI_RPG, isPremiumUser } = ctx;

        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : m.sender);
        const targetUser = global.db.users[targetJid] || (global.db.users[targetJid] = {});
        const pushName = targetJid === m.sender ? m.pushName : (await Dinz.getName(targetJid) || 'Player');
        const textResult = HITORI_RPG.getProfile(targetUser, pushName, targetJid);
        await Dinz.sendMessage(m.chat, { react: { text: '🧑🏻‍🏫', key: m.key } }).catch(() => {});

        let ppUrl = '';
        try {
            ppUrl = await Dinz.profilePictureUrl(targetJid, 'image').catch(() => '');
        } catch (_) {}

        const isTargetOwner = (targetJid === (global.owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net')) || isCreator;
        const isTargetPrem = isPremiumUser(targetJid);
        const statusIcon = isTargetOwner ? 'OWNER' : (isTargetPrem ? 'PREMIUM' : 'FREE');
        const statusText = isTargetOwner ? 'Owner' : (isTargetPrem ? 'Premium' : 'Free User');
        const userId = targetJid.split('@')[0];

        const cardBuffer = await HITORI_RPG.renderProfileCard(targetUser, pushName, ppUrl, statusText, statusIcon, userId);
        if (cardBuffer && Buffer.isBuffer(cardBuffer)) {
            return Dinz.sendMessage(m.chat, {
                image: cardBuffer,
                caption: textResult,
                mentions: [targetJid]
            }, { quoted: m });
        } else {
            return Reply(textResult, [targetJid]);
        }
        return true;
    }
};
