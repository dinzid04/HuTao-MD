const { runRichGame } = require('./_helper');

module.exports = {
    name: 'ttc',
    category: 'richgame',
    commands: ['ttc', 'ttcrich'],

    async execute(ctx) {
        return runRichGame(ctx, 'ttc');
    }
};
