const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'enccustom',
    category: 'obfuscator',
    commands: [
        'enccustom', 'customenc', 'enc-custom', 'encrypt-custom', 'encryptcustom', 'jscustomenc', 'enccustomjs'
    ],

    async execute(ctx) {
        return runObfuscate(ctx, 'custom');
    }
};
