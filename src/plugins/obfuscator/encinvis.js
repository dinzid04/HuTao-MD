const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encinvis',
    category: 'obfuscator',
    commands: [
        'encinvis', 'invisenc', 'enc-invis', 'encrypt-invis', 'encryptinvis', 'encinvisible', 'encjsinvis', 'jsinvisenc'
    ],

    async execute(ctx) {
        return runObfuscate(ctx, 'invis');
    }
};
