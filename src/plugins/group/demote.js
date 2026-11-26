const { cleanNum, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'demote',
    category: 'group',
    commands: ['demote'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply admin yang ingin diturunkan.`);
        await Dinz.groupParticipantsUpdate(m.chat, [target], 'demote');
        return Reply(`📉 @${cleanNum(target)} telah diturunkan menjadi Member Biasa.`, [target]);
    }
};
