const { formatCard, cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'tembak',
    category: 'fun',
    commands: ['tembak'],

    async execute(ctx) {
        const { Dinz, m, body, Reply, botCtx, usedPrefix } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        if (!m.isGroup) return Reply(global.mess.group);
        const target = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!target) return Reply(`💘 Tag orang yang mau kamu tembak! Contoh: \`${usedPrefix}tembak @user\``);
        if (target === m.sender) return Reply('❌ Masa nembak diri sendiri?');
        if (couples[m.sender]?.partner) return Reply(`❌ Kamu sudah berpasangan dengan @${cleanNum(couples[m.sender].partner)}!`, [couples[m.sender].partner]);
        if (couples[target]?.partner) return Reply(`💔 Dia sudah berpasangan dengan @${cleanNum(couples[target].partner)}.`, [couples[target].partner]);

        couples[m.sender] = { pending: target, partner: null, since: null };
        saveCouples();
        return Reply(formatCard({
            icon: '💘',
            title: 'TEMBAK GEBETAN',
            body: `@${cleanNum(m.sender)} menyatakan cinta kepada @${cleanNum(target)}! ❤️\n\nKetik \`${usedPrefix}terima @${cleanNum(m.sender)}\` untuk menerima\nAtau \`${usedPrefix}tolak @${cleanNum(m.sender)}\` untuk menolak.`
        }), [m.sender, target]);
    }
};
