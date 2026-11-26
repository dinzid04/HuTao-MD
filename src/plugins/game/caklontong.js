module.exports = {
    name: 'caklontong',
    category: 'game',
    commands: ['caklontong'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
