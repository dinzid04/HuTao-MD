const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'blackpinkstyle',
    category: 'ephoto',
    commands: ['blackpinkstyle'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'blackpinkstyle');
    }
};
