const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encbigsize',
    category: 'obfuscator',
    commands: ['encbigsize', 'bigsizeenc', 'enc-bigsize', 'encrypt-bigsize', 'bigsize', 'bigsizeencrypt'],

    async execute(ctx) {
        return runObfuscate(ctx, 'bigsize');
    }
};
