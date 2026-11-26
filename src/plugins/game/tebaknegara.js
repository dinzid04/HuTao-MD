module.exports = {
    name: 'tebaknegara',
    category: 'game',
    commands: ['tebaknegara'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
