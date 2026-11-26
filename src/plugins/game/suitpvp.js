const { handleSuitPvpCmd } = require('../../services/games-extra');

module.exports = {
    name: 'suitpvp',
    category: 'game',
    commands: ['suitpvp', 'suit', 'janken'],

    async execute(ctx) {
        const { Dinz, m, usedPrefix } = ctx;

        await handleSuitPvpCmd(Dinz, m, usedPrefix);
        return true;
    }
};
