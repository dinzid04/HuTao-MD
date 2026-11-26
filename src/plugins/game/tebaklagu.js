module.exports = {
    name: 'tebaklagu',
    category: 'game',
    commands: ['tebaklagu'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
