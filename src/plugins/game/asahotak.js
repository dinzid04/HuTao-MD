module.exports = {
    name: 'asahotak',
    category: 'game',
    commands: ['asahotak'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
