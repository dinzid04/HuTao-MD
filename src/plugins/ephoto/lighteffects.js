const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'lighteffects',
    category: 'ephoto',
    commands: ['lighteffects'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'lighteffects');
    }
};
