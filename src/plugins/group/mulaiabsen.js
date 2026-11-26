const { formatCard, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'mulaiabsen',
    category: 'group',
    commands: ['mulaiabsen', 'startabsen'],

    async execute(ctx) {
        const { m, text, body, isCreator, Reply, moment, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const g = getGroupObj(m.chat);
        const title = text.trim() || `Absen ${moment().tz('Asia/Jakarta').format('DD MMM YYYY')}`;
        g.absen = {
            title,
            createdBy: m.sender,
            createdAt: Date.now(),
            list: []
        };
        return Reply(formatCard({
            icon: '📋',
            title: 'ABSEN DIMULAI',
            rows: [
                { label: 'Judul', value: title },
                { label: 'Pembuat', value: `@${cleanNum(m.sender)}` }
            ],
            body: `Member silakan ketik \`${usedPrefix}absen\` untuk mengisi daftar hadir.\nKetik \`${usedPrefix}cekabsen\` untuk melihat rekap.`
        }), [m.sender]);
    }
};
