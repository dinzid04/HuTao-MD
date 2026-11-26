const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encsiu',
    category: 'obfuscator',
    commands: [
        'encsiu', 'siuenc', 'enc-siu', 'encrypt-siu', 'encryptsiu', 'encsiujs', 'jssiuenc'
    ],

    async execute(ctx) {
        return runObfuscate(ctx, 'siu');
    }
};
