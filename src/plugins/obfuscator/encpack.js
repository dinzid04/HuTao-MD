const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encpack',
    category: 'obfuscator',
    commands: ['encpack', 'packenc', 'enc-pack', 'encrypt-pack', 'encryptpack'],

    async execute(ctx) {
        return runObfuscate(ctx, 'pack');
    }
};
