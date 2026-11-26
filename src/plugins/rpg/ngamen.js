const { runRpgJob } = require('./_helper');

module.exports = {
    name: 'ngamen',
    category: 'rpg',
    commands: ['ngamen'],

    async execute(ctx) {
        return runRpgJob(ctx, 'ngamen');
    }
};
