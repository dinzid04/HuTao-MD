const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'multicoloredneon',
    category: 'ephoto',
    commands: ['multicoloredneon'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'multicoloredneon');
    }
};
