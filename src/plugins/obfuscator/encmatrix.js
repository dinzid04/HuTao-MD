const { runObfuscate } = require('./_helper');

module.exports = {
    name: 'encmatrix',
    category: 'obfuscator',
    commands: ['encmatrix', 'matrixenc', 'enc-matrix', 'encrypt-matrix'],

    async execute(ctx) {
        return runObfuscate(ctx, 'matrix');
    }
};
