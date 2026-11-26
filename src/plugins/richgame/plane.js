const { runRichGame } = require('./_helper');

module.exports = {
    name: 'plane',
    category: 'richgame',
    commands: ['plane', 'spacerush', 'pesawat'],

    async execute(ctx) {
        return runRichGame(ctx, 'plane');
    }
};
