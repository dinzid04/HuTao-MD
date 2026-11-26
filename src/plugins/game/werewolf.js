const { handleWerewolfCmd } = require('../../services/games-extra');

module.exports = {
    name: 'werewolf',
    category: 'game',
    commands: ['werewolf', 'ww', 'wwgc'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, usedPrefix } = ctx;

        await handleWerewolfCmd(Dinz, m, args, usedPrefix, isCreator);
        return true;
    }
};
