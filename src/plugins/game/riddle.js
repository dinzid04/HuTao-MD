module.exports = {
    name: 'riddle',
    category: 'game',
    commands: ['riddle'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
