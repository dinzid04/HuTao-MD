const { cleanNum } = require('./_helper');

module.exports = {
    name: 'gajoin',
    category: 'group',
    commands: ['gajoin', 'ikutgiveaway', 'joingiveaway'],

    async execute(ctx) {
        const { Dinz, m, args, Reply, botCtx, usedPrefix } = ctx;

        const giveaways = botCtx.getSection('giveaways', Dinz) || {};
        let id = (args[0] || '').trim().toUpperCase();
        if (!id) {
            const activeInChat = Object.values(giveaways).find((g) => g.chatId === m.chat && !g.ended);
            if (activeInChat) id = activeInChat.id;
        }
        const ga = giveaways[id];
        if (!ga) return Reply(`❌ Giveaway tidak ditemukan. Cek ID lewat \`${usedPrefix}galist\`.`);
        if (ga.ended) return Reply('❌ Giveaway tersebut sudah berakhir.');
        if (ga.participants.includes(m.sender)) return Reply('✅ Kamu sudah terdaftar di giveaway ini.');
        ga.participants.push(m.sender);
        botCtx.setSection('giveaways', giveaways, Dinz);
        return Reply(`🎉 @${cleanNum(m.sender)} berhasil bergabung ke *${ga.title}* (\`${id}\`)!\nTotal peserta: *${ga.participants.length}* orang.`, [m.sender]);
    }
};
