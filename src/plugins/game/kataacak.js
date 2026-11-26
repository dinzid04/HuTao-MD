module.exports = {
    name: 'kataacak',
    category: 'game',
    commands: ['kataacak'],

    async execute(ctx) {
        const { Dinz, m, command, startGame } = ctx;

        await startGame(Dinz, m, command);
        return true;
    }
};
