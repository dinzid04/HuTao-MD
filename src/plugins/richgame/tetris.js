const { runRichGame } = require('./_helper');

module.exports = {
    name: 'tetris',
    category: 'richgame',
    commands: ['tetris', 'block', 'richtetris'],

    async execute(ctx) {
        return runRichGame(ctx, 'tetris');
    }
};
