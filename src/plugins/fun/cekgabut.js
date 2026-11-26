const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekgabut',
    category: 'fun',
    commands: ['cekgabut'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekgabut');
    }
};
