const { runRichGame } = require('./_helper');

module.exports = {
    name: 'breakout',
    category: 'richgame',
    commands: ['breakout', 'brick', 'arkanoid', 'richbrick'],

    async execute(ctx) {
        return runRichGame(ctx, 'breakout');
    }
};
