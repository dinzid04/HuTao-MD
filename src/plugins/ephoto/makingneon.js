const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'makingneon',
    category: 'ephoto',
    commands: ['makingneon'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'makingneon');
    }
};
