const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: '1917style',
    category: 'ephoto',
    commands: ['1917style'],

    async execute(ctx) {
        return runEphotoEffect(ctx, '1917style');
    }
};
