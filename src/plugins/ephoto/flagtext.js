const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'flagtext',
    category: 'ephoto',
    commands: ['flagtext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'flagtext');
    }
};
