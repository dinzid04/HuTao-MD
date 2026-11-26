module.exports = {
    name: 'tekateki',
    category: 'game',
    commands: ['tekateki'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
