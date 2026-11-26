module.exports = {
    name: 'family100',
    category: 'game',
    commands: ['family100'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
