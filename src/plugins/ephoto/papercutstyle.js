const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'papercutstyle',
    category: 'ephoto',
    commands: ['papercutstyle'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'papercutstyle');
    }
};
