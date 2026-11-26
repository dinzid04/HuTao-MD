const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'enclight',
    category: 'obfuscator',
    commands: ['enclight', 'lightenc', 'enc-light', 'encrypt-light'],

    async execute(ctx) {
        return runObfuscate(ctx, 'light');
    }
};
