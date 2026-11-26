const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'enchex',
    category: 'obfuscator',
    commands: ['enchex', 'hexenc', 'enc-hex', 'encrypt-hex'],

    async execute(ctx) {
        return runObfuscate(ctx, 'hex');
    }
};
