const { runRichGame } = require('./_helper');

module.exports = {
    name: 'snake',
    category: 'richgame',
    commands: ['snake', 'ular', 'richsnake'],

    async execute(ctx) {
        return runRichGame(ctx, 'snake');
    }
};
