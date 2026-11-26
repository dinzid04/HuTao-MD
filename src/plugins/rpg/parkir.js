const { runRpgJob } = require('./_helper');

module.exports = {
    name: 'parkir',
    category: 'rpg',
    commands: ['parkir'],

    async execute(ctx) {
        return runRpgJob(ctx, 'parkir');
    }
};
