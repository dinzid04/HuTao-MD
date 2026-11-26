const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'cartoonstyle',
    category: 'ephoto',
    commands: ['cartoonstyle'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'cartoonstyle');
    }
};
