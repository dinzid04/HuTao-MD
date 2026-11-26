const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'royaltext',
    category: 'ephoto',
    commands: ['royaltext'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'royaltext');
    }
};
