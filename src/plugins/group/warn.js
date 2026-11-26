const { formatCard, cleanNum, getGroupObj, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'warn',
    category: 'group',
    commands: ['warn'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply, usedPrefix } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Tag atau reply member yang ingin diberi peringatan.\nContoh: \`${usedPrefix}warn @user spam\``);
        const reason = args.filter((a) => !a.startsWith('@')).join(' ').trim() || 'Melanggar aturan grup';
        const g = getGroupObj(m.chat);
        if (!g.warns) g.warns = {};
        if (!g.warns[target]) g.warns[target] = { count: 0, reasons: [] };
        g.warns[target].count += 1;
        g.warns[target].reasons.push(reason);
        const count = g.warns[target].count;
        const maxWarn = 3;

        if (count >= maxWarn) {
            delete g.warns[target];
            await Reply(formatCard({
                icon: '🚨',
                title: 'BATAS WARN TERCAPAI',
                rows: [
                    { label: 'Member', value: `@${cleanNum(target)}` },
                    { label: 'Status', value: `${count}/${maxWarn} (Otomatis Dikeluarkan)` },
                    { label: 'Alasan Terakhir', value: reason }
                ]
            }), [target]);
            if (m.isBotAdmin) {
                await Dinz.groupParticipantsUpdate(m.chat, [target], 'remove').catch(() => {});
            }
            return;
        }

        return Reply(formatCard({
            icon: '⚠️',
            title: 'PERINGATAN MEMBER',
            rows: [
                { label: 'Member', value: `@${cleanNum(target)}` },
                { label: 'Total Warn', value: `${count}/${maxWarn}` },
                { label: 'Alasan', value: reason }
            ],
            footer: `Mencapai ${maxWarn} warn akan otomatis dikeluarkan dari grup.`
        }), [target]);
    }
};
