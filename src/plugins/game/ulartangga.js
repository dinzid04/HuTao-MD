const { handleUlarTanggaCmd } = require('../../services/games-extra');

module.exports = {
    name: 'ulartangga',
    category: 'game',
    commands: ['ulartangga', 'ut', 'snakeladder'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, usedPrefix } = ctx;

        await handleUlarTanggaCmd(Dinz, m, args, usedPrefix, isCreator);
        return true;
    }
};
