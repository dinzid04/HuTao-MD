const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'logomaker',
    category: 'ephoto',
    commands: ['logomaker'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'logomaker');
    }
};
