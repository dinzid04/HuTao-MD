const { runRichGame } = require('./_helper');

module.exports = {
    name: 'memory',
    category: 'richgame',
    commands: ['memory', 'memori', 'matchcard', 'richmemory'],

    async execute(ctx) {
        return runRichGame(ctx, 'memory');
    }
};
