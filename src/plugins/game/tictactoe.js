const { handleTicTacToeCmd } = require('../../services/games-extra');

module.exports = {
    name: 'tictactoe',
    category: 'game',
    commands: ['tictactoe', 'ttt', 'xo'],

    async execute(ctx) {
        const { Dinz, m, text, usedPrefix } = ctx;

        await handleTicTacToeCmd(Dinz, m, text, usedPrefix);
        return true;
    }
};
