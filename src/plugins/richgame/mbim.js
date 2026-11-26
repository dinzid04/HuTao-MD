const { runRichGame } = require('./_helper');

module.exports = {
    name: 'mbim',
    category: 'richgame',
    commands: ['mbim', 'highway', 'carrace', 'balapan'],

    async execute(ctx) {
        return runRichGame(ctx, 'mbim');
    }
};
