const { formatCard, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'groupinfo',
    category: 'group',
    commands: ['groupinfo', 'infogrup'],

    async execute(ctx) {
        const { Dinz, m, body, Reply, moment } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const meta = await Dinz.groupMetadata(m.chat).catch(() => m.metadata);
        const parts = meta?.participants || [];
        const admins = parts.filter((p) => p.admin);
        const g = getGroupObj(m.chat);
        const created = meta?.creation ? moment(meta.creation * 1000).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm [WIB]') : '-';
        const activeFlags = ['welcome', 'left', 'antilink', 'antibadword', 'antispam', 'antisticker', 'antivirtex', 'antijudol', 'antiphising']
            .filter((k) => g[k])
            .join(', ') || 'Tidak ada';

        const card = formatCard({
            icon: '👥',
            title: 'INFORMASI GRUP',
            rows: [
                { label: 'Nama', value: meta?.subject || '-' },
                { label: 'ID Grup', value: `\`${m.chat}\`` },
                { label: 'Dibuat', value: created },
                { label: 'Creator', value: meta?.owner ? `@${cleanNum(meta.owner)}` : '-' },
                { label: 'Member', value: `${parts.length} orang (${admins.length} admin)` },
                { label: 'Slowmode', value: g.slowmode ? `${g.slowmode} detik` : 'Nonaktif' },
                { label: 'Proteksi Aktif', value: activeFlags }
            ],
            body: meta?.desc ? `*Deskripsi:*\n${String(meta.desc).slice(0, 500)}` : ''
        });
        return Reply(card, meta?.owner ? [meta.owner] : []);
    }
};
