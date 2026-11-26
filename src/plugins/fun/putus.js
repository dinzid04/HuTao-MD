const { cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'putus',
    category: 'fun',
    commands: ['putus'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const partner = couples[m.sender]?.partner;
        if (!partner) return Reply('❌ Kamu sedang jomblo, tidak punya pasangan.');
        delete couples[m.sender];
        delete couples[partner];
        saveCouples();
        return Reply(`💔 @${cleanNum(m.sender)} memutuskan hubungan dengan @${cleanNum(partner)}.`, [m.sender, partner]);
    }
};
