const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'resetintro',
    category: 'group',
    commands: ['resetintro'],

    async execute(ctx) {
        const { m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        delete getGroupObj(m.chat).introText;
        return Reply('✅ Format intro grup dikembalikan ke default.');
    }
};
