const { runEphotoEffect } = require('./_helper');

module.exports = {
    name: 'galaxywallpaper',
    category: 'ephoto',
    commands: ['galaxywallpaper'],

    async execute(ctx) {
        return runEphotoEffect(ctx, 'galaxywallpaper');
    }
};
