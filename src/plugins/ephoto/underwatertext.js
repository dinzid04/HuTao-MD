const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'underwatertext',
    category: 'ephoto',
    commands: ['underwatertext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'underwatertext');
    }
};
