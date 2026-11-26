const { cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'divorce',
    category: 'rpg',
    commands: ['divorce', 'cerai'],

    async execute(ctx) {
        const { Dinz, m, Reply, botCtx } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const partner = couples[m.sender]?.partner;
        if (!partner || !couples[m.sender]?.married) return Reply('❌ Kamu belum menikah.');
        delete couples[m.sender];
        delete couples[partner];
        saveCouples();
        return Reply(`💔 @${cleanNum(m.sender)} dan @${cleanNum(partner)} telah resmi bercerai.`, [m.sender, partner]);
    }
};
