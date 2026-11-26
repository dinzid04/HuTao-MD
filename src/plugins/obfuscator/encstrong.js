const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encstrong',
    category: 'obfuscator',
    commands: [
        'encstrong', 'strongenc', 'enc-strong', 'encrypt-strong', 'encryptstrong', 'encstrongjs', 'jsstrongenc'
    ],

    async execute(ctx) {
        return runObfuscate(ctx, 'strong');
    }
};
