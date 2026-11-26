const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encghost',
    category: 'obfuscator',
    commands: ['encghost', 'ghostenc', 'enc-ghost', 'encrypt-ghost'],

    async execute(ctx) {
        return runObfuscate(ctx, 'ghost');
    }
};
