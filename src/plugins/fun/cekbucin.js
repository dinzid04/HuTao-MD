const { runCekTrait } = require('./_helper');

module.exports = {
    name: 'cekbucin',
    category: 'fun',
    commands: ['cekbucin'],

    async execute(ctx) {
        return runCekTrait(ctx, 'cekbucin');
    }
};
