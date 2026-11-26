const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encultra',
    category: 'obfuscator',
    commands: [
        'encultra', 'ultraenc', 'enc-ultra', 'encrypt-ultra', 'encryptultra', 'encultrajs', 'jsultraenc'
    ],

    async execute(ctx) {
        return runObfuscate(ctx, 'ultra');
    }
};
