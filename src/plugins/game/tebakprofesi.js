module.exports = {
    name: 'tebakprofesi',
    category: 'game',
    commands: ['tebakprofesi'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
