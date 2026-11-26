const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'resetrulesgrup',
    category: 'group',
    commands: ['resetrulesgrup'],

    async execute(ctx) {
        const { m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        delete getGroupObj(m.chat).rulesText;
        return Reply('✅ Aturan grup berhasil direset.');
    }
};
