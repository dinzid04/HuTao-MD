module.exports = {
    name: 'sambungkata',
    category: 'game',
    commands: ['sambungkata'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
