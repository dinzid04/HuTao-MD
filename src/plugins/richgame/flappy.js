const { runRichGame } = require('./_helper');

module.exports = {
    name: 'flappy',
    category: 'richgame',
    commands: ['flappy', 'flappybird', 'bird'],

    async execute(ctx) {
        return runRichGame(ctx, 'flappy');
    }
};
