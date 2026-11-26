const { runRichGame } = require('./_helper');

module.exports = {
    name: 'stack',
    category: 'richgame',
    commands: ['stack', 'tower', 'richtower'],

    async execute(ctx) {
        return runRichGame(ctx, 'stack');
    }
};
