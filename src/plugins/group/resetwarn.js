const { cleanNum, getGroupObj, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'resetwarn',
    category: 'group',
    commands: ['resetwarn'],

    async execute(ctx) {
        const { m, args, isCreator, Reply } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const g = getGroupObj(m.chat);
        const target = resolveTargetJid();
        if (target) {
            if (g.warns) delete g.warns[target];
            return Reply(`✅ Semua warn untuk @${cleanNum(target)} telah direset.`, [target]);
        }
        g.warns = {};
        return Reply('✅ Seluruh daftar warn di grup ini telah direset.');
    }
};
