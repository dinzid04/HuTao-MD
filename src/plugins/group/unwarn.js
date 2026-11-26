const { cleanNum, getGroupObj, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'unwarn',
    category: 'group',
    commands: ['unwarn', 'delwarn'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, usedPrefix } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply member. Contoh: \`${usedPrefix}unwarn @user\``);
        const g = getGroupObj(m.chat);
        if (!g.warns?.[target] || g.warns[target].count <= 0) {
            return Reply('✅ Member tersebut tidak memiliki warn.');
        }
        g.warns[target].count -= 1;
        g.warns[target].reasons.pop();
        if (g.warns[target].count <= 0) delete g.warns[target];
        return Reply(`✅ 1 warn @${cleanNum(target)} dikurangi. Sisa: *${g.warns[target]?.count || 0}/3*.`, [target]);
    }
};
