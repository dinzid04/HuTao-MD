module.exports = {
    name: 'tebaklirik',
    category: 'game',
    commands: ['tebaklirik'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
