module.exports = {
    name: 'tebaklogo',
    category: 'game',
    commands: ['tebaklogo'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
