module.exports = {
    name: 'tebakgenshin',
    category: 'game',
    commands: ['tebakgenshin'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
