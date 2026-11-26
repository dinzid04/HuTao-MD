const { runRichGame } = require('./_helper');

module.exports = {
    name: 'simon',
    category: 'richgame',
    commands: ['simon', 'ingatwarna', 'richsimon'],

    async execute(ctx) {
        return runRichGame(ctx, 'simon');
    }
};
