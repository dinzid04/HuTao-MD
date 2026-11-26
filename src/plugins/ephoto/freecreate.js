const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'freecreate',
    category: 'ephoto',
    commands: ['freecreate'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'freecreate');
    }
};
