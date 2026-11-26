const { runRichGame } = require('./_helper');

module.exports = {
    name: 'connect4',
    category: 'richgame',
    commands: ['connect4', 'empatbaris', 'richc4'],

    async execute(ctx) {
        return runRichGame(ctx, 'connect4');
    }
};
