const { handleBlackjackCmd } = require('../../services/games-extra');

module.exports = {
    name: 'blackjack',
    category: 'game',
    commands: [
        'blackjack', 'bj', 'bj-join', 'bj-start', 'bj-hit', 'bj-stand', 'bj-double', 'bj-stop',
        'bj-help'
    ],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, usedPrefix } = ctx;

        await handleBlackjackCmd(Dinz, m, command, args, usedPrefix, isCreator);
        return true;
    }
};
