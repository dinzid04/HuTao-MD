const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'typographytext',
    category: 'ephoto',
    commands: ['typographytext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'typographytext');
    }
};
