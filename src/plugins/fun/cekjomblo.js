const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekjomblo',
    category: 'fun',
    commands: ['cekjomblo'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekjomblo');
    }
};
