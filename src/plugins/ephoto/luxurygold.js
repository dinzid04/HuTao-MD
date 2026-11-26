const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'luxurygold',
    category: 'ephoto',
    commands: ['luxurygold'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'luxurygold');
    }
};
