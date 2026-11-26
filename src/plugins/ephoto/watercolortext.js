const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'watercolortext',
    category: 'ephoto',
    commands: ['watercolortext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'watercolortext');
    }
};
