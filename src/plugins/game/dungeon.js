const { handleDungeonCmd } = require('../../services/games-extra');

module.exports = {
    name: 'dungeon',
    category: 'game',
    commands: ['dungeon', 'raid'],

    async execute(ctx) {
        const { Dinz, m, args, usedPrefix } = ctx;

        await handleDungeonCmd(Dinz, m, args, usedPrefix);
        return true;
    }
};
