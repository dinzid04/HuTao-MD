module.exports = {
    name: 'siapakahaku',
    category: 'game',
    commands: ['siapakahaku'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
