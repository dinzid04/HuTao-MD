const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekimut',
    category: 'fun',
    commands: ['cekimut'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekimut');
    }
};
