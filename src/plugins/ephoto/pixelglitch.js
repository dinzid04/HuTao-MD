const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'pixelglitch',
    category: 'ephoto',
    commands: ['pixelglitch'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'pixelglitch');
    }
};
