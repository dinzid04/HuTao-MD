const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'deletingtext',
    category: 'ephoto',
    commands: ['deletingtext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'deletingtext');
    }
};
