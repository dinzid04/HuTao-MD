const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'gradienttext',
    category: 'ephoto',
    commands: ['gradienttext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'gradienttext');
    }
};
