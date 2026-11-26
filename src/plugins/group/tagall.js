const { formatCard, cleanNum } = require('./_helper');

module.exports = {
    name: 'tagall',
    category: 'group',
    commands: ['tagall'],

    async execute(ctx) {
        const { Dinz, m, text, body, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const meta = await Dinz.groupMetadata(m.chat).catch(() => m.metadata);
        const parts = meta?.participants || [];
        const mentions = parts.map((p) => p.jid || p.id);
        const msg = text.trim() || 'Perhatian untuk seluruh member grup!';
        const list = mentions.map((j, i) => `${i + 1}. @${cleanNum(j)}`).join('\n');
        return Reply(formatCard({
            icon: '📢',
            title: 'TAG ALL MEMBER',
            rows: [{ label: 'Pesan', value: msg }],
            body: list
        }), mentions);
    }
};
