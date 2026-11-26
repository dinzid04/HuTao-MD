module.exports = {
    name: 'tebakgame',
    category: 'game',
    commands: ['tebakgame'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
