const { formatCard, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'listwarn',
    category: 'group',
    commands: ['listwarn'],

    async execute(ctx) {
        const { m, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const g = getGroupObj(m.chat);
        const entries = Object.entries(g.warns || {}).filter(([, v]) => v?.count > 0);
        if (!entries.length) return Reply('✅ Belum ada member yang terkena warn di grup ini.');
        const body = entries
            .map(([jid, v], i) => `${i + 1}. @${cleanNum(jid)} : *${v.count}/3* (${v.reasons.slice(-1)[0] || '-'})`)
            .join('\n');
        return Reply(formatCard({ icon: '⚠️', title: 'DAFTAR WARN GRUP', body }), entries.map(([jid]) => jid));
    }
};
