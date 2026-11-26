const { runRpgJob } = require('./_helper');

module.exports = {
    name: 'berladang',
    category: 'rpg',
    commands: ['berladang'],

    async execute(ctx) {
        return runRpgJob(ctx, 'berladang');
    }
};
