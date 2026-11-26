const { cleanNum, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'promote',
    category: 'group',
    commands: ['promote'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply member yang ingin dijadikan admin.`);
        await Dinz.groupParticipantsUpdate(m.chat, [target], 'promote');
        return Reply(`👑 @${cleanNum(target)} telah dipromosikan menjadi Admin Grup!`, [target]);
    }
};
