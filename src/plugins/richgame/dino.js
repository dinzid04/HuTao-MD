const { runRichGame } = require('./_helper');

module.exports = {
    name: 'dino',
    category: 'richgame',
    commands: ['dino', 'runner', 'dinorich'],

    async execute(ctx) {
        return runRichGame(ctx, 'dino');
    }
};
