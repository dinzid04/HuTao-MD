const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'summerbeach',
    category: 'ephoto',
    commands: ['summerbeach'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'summerbeach');
    }
};
