module.exports = {
    name: 'tebakgambar',
    category: 'game',
    commands: ['tebakgambar'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
