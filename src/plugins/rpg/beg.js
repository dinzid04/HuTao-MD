const { runRpgJob } = require('./_helper');

module.exports = {
    name: 'beg',
    category: 'rpg',
    commands: ['beg', 'ngemis'],

    async execute(ctx) {
        return runRpgJob(ctx, 'beg');
    }
};
