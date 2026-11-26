const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'sandsummer',
    category: 'ephoto',
    commands: ['sandsummer'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'sandsummer');
    }
};
