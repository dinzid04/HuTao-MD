const { formatCard, cleanNum, getGroupObj } = require('./_helper');

module.exports = {
    name: 'absen',
    category: 'group',
    commands: ['absen'],

    async execute(ctx) {
        const { m, body, Reply, moment, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const g = getGroupObj(m.chat);
        if (!g.absen) return Reply(`❌ Belum ada sesi absen aktif. Admin bisa mulai dengan \`${usedPrefix}mulaiabsen <judul>\`.`);
        if (g.absen.list.some((x) => x.jid === m.sender)) {
            return Reply('✅ Kamu sudah tercatat hadir di absen ini.');
        }
        g.absen.list.push({
            jid: m.sender,
            name: m.pushName || cleanNum(m.sender),
            time: moment().tz('Asia/Jakarta').format('HH:mm:ss')
        });
        const listText = g.absen.list.map((x, i) => `${i + 1}. @${cleanNum(x.jid)} (${x.time})`).join('\n');
        return Reply(formatCard({
            icon: '✅',
            title: g.absen.title,
            rows: [{ label: 'Total Hadir', value: `${g.absen.list.length} orang` }],
            body: listText
        }), g.absen.list.map((x) => x.jid));
    }
};
