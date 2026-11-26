const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'advancedglow',
    category: 'ephoto',
    commands: ['advancedglow'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'advancedglow');
    }
};
