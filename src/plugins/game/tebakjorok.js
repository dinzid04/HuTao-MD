module.exports = {
    name: 'tebakjorok',
    category: 'game',
    commands: ['tebakjorok'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
