module.exports = {
    name: 'tebakkalimat',
    category: 'game',
    commands: ['tebakkalimat'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
