const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'blackpinklogo',
    category: 'ephoto',
    commands: ['blackpinklogo'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'blackpinklogo');
    }
};
