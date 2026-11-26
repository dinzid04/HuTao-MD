module.exports = {
    name: 'tebakmakanan',
    category: 'game',
    commands: ['tebakmakanan'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
