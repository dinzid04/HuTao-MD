const { cleanNum, getGroupObj, parseDurationMs, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'mutemember',
    category: 'group',
    commands: ['mutemember'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, usedPrefix } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply member.\nContoh: \`${usedPrefix}mutemember @user 10m\``);
        const durArg = args.find((a) => /^\d+(s|m|h|d)$/i.test(a));
        const durMs = durArg ? parseDurationMs(durArg) : null;
        const g = getGroupObj(m.chat);
        if (!g.mutedMembers) g.mutedMembers = {};
        g.mutedMembers[target] = durMs ? Date.now() + durMs : true;
        return Reply(`🔇 @${cleanNum(target)} di-mute${durArg ? ` selama *${durArg}*` : ' secara permanen'}. Pesannya akan otomatis dihapus.`, [target]);
    }
};
