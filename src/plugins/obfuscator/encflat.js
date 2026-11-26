const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encflat',
    category: 'obfuscator',
    commands: ['encflat', 'flatenc', 'enc-flat', 'encrypt-flat'],

    async execute(ctx) {
        return runObfuscate(ctx, 'flat');
    }
};
