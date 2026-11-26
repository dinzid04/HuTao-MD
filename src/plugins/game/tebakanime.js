module.exports = {
    name: 'tebakanime',
    category: 'game',
    commands: ['tebakanime'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
