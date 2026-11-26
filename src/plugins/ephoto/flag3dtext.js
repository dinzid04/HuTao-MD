const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'flag3dtext',
    category: 'ephoto',
    commands: ['flag3dtext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'flag3dtext');
    }
};
