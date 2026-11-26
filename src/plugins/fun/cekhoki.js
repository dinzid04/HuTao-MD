const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekhoki',
    category: 'fun',
    commands: ['cekhoki'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekhoki');
    }
};
