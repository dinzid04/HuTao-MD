module.exports = {
    name: 'susunkata',
    category: 'game',
    commands: ['susunkata'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
