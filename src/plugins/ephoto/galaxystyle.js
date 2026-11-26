const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'galaxystyle',
    category: 'ephoto',
    commands: ['galaxystyle'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'galaxystyle');
    }
};
