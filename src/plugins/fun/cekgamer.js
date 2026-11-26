const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekgamer',
    category: 'fun',
    commands: ['cekgamer'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekgamer');
    }
};
