const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'ceksigma',
    category: 'fun',
    commands: ['ceksigma'],

    async execute(ctx) {
        return runCekTrait(ctx, 'ceksigma');
    }
};
