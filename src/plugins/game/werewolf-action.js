const { handleWerewolfNightAction } = require('../../services/games-extra');

module.exports = {
    name: 'werewolf-action',
    category: 'game',
    commands: ['wwkill', 'wwsee', 'wwprotect', 'wwsorcerer'],

    async execute(ctx) {
        const { Dinz, m, command, args } = ctx;

        await handleWerewolfNightAction(Dinz, m, command, args);
        return true;
    }
};
