module.exports = {
    name: 'lengkapikalimat',
    category: 'game',
    commands: ['lengkapikalimat'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
