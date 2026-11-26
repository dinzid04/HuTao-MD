const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'ceknolep',
    category: 'fun',
    commands: ['ceknolep'],

    async execute(ctx) {
        return runCekTrait(ctx, 'ceknolep');
    }
};
