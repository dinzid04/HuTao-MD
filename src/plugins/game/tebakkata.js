module.exports = {
    name: 'tebakkata',
    category: 'game',
    commands: ['tebakkata'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
