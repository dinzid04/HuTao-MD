const { formatCard } = require('./_helper');

module.exports = {
    name: 'linkgc',
    category: 'group',
    commands: ['linkgc', 'linkgrup'],

    async execute(ctx) {
        const { Dinz, m, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const code = await Dinz.groupInviteCode(m.chat);
        return Reply(formatCard({
            icon: '🔗',
            title: 'LINK INVITE GRUP',
            rows: [
                { label: 'Grup', value: m.metadata?.subject || m.chat },
                { label: 'Link', value: `https://chat.whatsapp.com/${code}` }
            ]
        }));
    }
};
