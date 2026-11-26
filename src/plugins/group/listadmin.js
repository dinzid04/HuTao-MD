const { formatCard, cleanNum } = require('./_helper');

module.exports = {
    name: 'listadmin',
    category: 'group',
    commands: ['listadmin', 'adminlist'],

    async execute(ctx) {
        const { Dinz, m, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const meta = await Dinz.groupMetadata(m.chat).catch(() => m.metadata);
        const admins = (meta?.participants || []).filter((p) => p.admin);
        if (!admins.length) return Reply('❌ Tidak ada admin ditemukan.');
        const mentions = admins.map((a) => a.jid || a.id);
        const body = admins.map((a, i) => `${i + 1}. ${a.admin === 'superadmin' ? '👑' : '🛡️'} @${cleanNum(a.jid || a.id)}`).join('\n');
        return Reply(formatCard({
            icon: '🛡️',
            title: `DAFTAR ADMIN (${admins.length})`,
            body
        }), mentions);
    }
};
