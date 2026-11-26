module.exports = {
    name: 'tebakbendera',
    category: 'game',
    commands: ['tebakbendera'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
