const { cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'tolak',
    category: 'fun',
    commands: ['tolak'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const target = m.mentionedJid?.[0] || m.quoted?.sender
            || Object.keys(couples).find((k) => couples[k]?.pending === m.sender);
        if (!target || couples[target]?.pending !== m.sender) {
            return Reply('❌ Tidak ada yang sedang menembakmu.');
        }
        delete couples[target];
        saveCouples();
        return Reply(`💔 @${cleanNum(m.sender)} menolak cinta @${cleanNum(target)}. Yang sabar ya!`, [m.sender, target]);
    }
};
