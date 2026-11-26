const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'glitchtext',
    category: 'ephoto',
    commands: ['glitchtext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'glitchtext');
    }
};
