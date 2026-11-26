const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encmini',
    category: 'obfuscator',
    commands: ['encmini', 'minienc', 'enc-mini', 'encrypt-mini'],

    async execute(ctx) {
        return runObfuscate(ctx, 'mini');
    }
};
