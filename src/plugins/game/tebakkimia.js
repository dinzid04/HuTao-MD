module.exports = {
    name: 'tebakkimia',
    category: 'game',
    commands: ['tebakkimia'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
