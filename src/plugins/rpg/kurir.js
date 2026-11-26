const { runRpgJob } = require('./_helper');

module.exports = {
    name: 'kurir',
    category: 'rpg',
    commands: ['kurir'],

    async execute(ctx) {
        return runRpgJob(ctx, 'kurir');
    }
};
