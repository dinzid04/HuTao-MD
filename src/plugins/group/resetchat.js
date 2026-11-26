const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'resetchat',
    category: 'group',
    commands: ['resetchat'],

    async execute(ctx) {
        const { m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        getGroupObj(m.chat).chatStats = {};
        return Reply('✅ Statistik Top Chat grup ini berhasil direset.');
    }
};
