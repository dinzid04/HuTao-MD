const { formatCard, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'cekabsen',
    category: 'group',
    commands: ['cekabsen'],

    async execute(ctx) {
        const { m, body, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const g = getGroupObj(m.chat);
        if (!g.absen) return Reply('❌ Tidak ada sesi absen yang sedang berlangsung.');
        const listText = g.absen.list.length
            ? g.absen.list.map((x, i) => `${i + 1}. @${cleanNum(x.jid)} (${x.time})`).join('\n')
            : '_Belum ada yang absen._';
        return Reply(formatCard({
            icon: '📋',
            title: g.absen.title,
            rows: [{ label: 'Total Hadir', value: `${g.absen.list.length} orang` }],
            body: listText
        }), g.absen.list.map((x) => x.jid));
    }
};
