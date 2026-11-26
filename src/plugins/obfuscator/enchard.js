const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'enchard',
    category: 'obfuscator',
    commands: ['enchard', 'hardenc', 'enc-hard', 'encrypt-hard', 'encrypthard'],

    async execute(ctx) {
        return runObfuscate(ctx, 'hard');
    }
};
