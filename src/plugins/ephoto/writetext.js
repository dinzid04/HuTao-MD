const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'writetext',
    category: 'ephoto',
    commands: ['writetext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'writetext');
    }
};
