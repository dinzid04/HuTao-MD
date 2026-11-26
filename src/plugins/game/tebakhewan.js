module.exports = {
    name: 'tebakhewan',
    category: 'game',
    commands: ['tebakhewan'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
