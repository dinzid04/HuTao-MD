const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'ceksetia',
    category: 'fun',
    commands: ['ceksetia'],

    async execute(ctx) {
        return runCekTrait(ctx, 'ceksetia');
    }
};
