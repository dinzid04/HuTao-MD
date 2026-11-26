const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'effectclouds',
    category: 'ephoto',
    commands: ['effectclouds'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'effectclouds');
    }
};
