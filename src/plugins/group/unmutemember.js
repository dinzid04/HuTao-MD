const { cleanNum, getGroupObj, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'unmutemember',
    category: 'group',
    commands: ['unmutemember'],

    async execute(ctx) {
        const { m, args, isCreator, Reply } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply member yang ingin di-unmute.`);
        const g = getGroupObj(m.chat);
        if (g.mutedMembers) delete g.mutedMembers[target];
        return Reply(`🔊 @${cleanNum(target)} sudah di-unmute.`, [target]);
    }
};
