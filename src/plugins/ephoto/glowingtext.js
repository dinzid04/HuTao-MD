const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'glowingtext',
    category: 'ephoto',
    commands: ['glowingtext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'glowingtext');
    }
};
