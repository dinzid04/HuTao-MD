const { runRichGame } = require('./_helper');

module.exports = {
    name: 'minesweeper',
    category: 'richgame',
    commands: ['minesweeper', 'mine', 'bom', 'richmine'],

    async execute(ctx) {
        return runRichGame(ctx, 'minesweeper');
    }
};
