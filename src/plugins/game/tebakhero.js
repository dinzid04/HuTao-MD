module.exports = {
    name: 'tebakhero',
    category: 'game',
    commands: ['tebakhero'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
