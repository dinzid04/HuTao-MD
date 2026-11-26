const { runRichGame } = require('./_helper');

module.exports = {
    name: 'wordle',
    category: 'richgame',
    commands: ['wordle', 'katla', 'richwordle'],

    async execute(ctx) {
        return runRichGame(ctx, 'wordle');
    }
};
