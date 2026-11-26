const { runRichGame } = require('./_helper');

module.exports = {
    name: '2048',
    category: 'richgame',
    commands: ['2048', 'rich2048', 'game2048'],

    async execute(ctx) {
        return runRichGame(ctx, '2048');
    }
};
