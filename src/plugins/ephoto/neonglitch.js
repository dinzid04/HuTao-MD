const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'neonglitch',
    category: 'ephoto',
    commands: ['neonglitch'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'neonglitch');
    }
};
