const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encmax',
    category: 'obfuscator',
    commands: ['encmax', 'maxenc', 'enc-max', 'encrypt-max', 'encryptmax'],

    async execute(ctx) {
        return runObfuscate(ctx, 'max');
    }
};
