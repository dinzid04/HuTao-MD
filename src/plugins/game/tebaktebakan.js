module.exports = {
    name: 'tebaktebakan',
    category: 'game',
    commands: ['tebaktebakan'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
