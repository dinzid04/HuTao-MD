const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'livescore',
    category: 'tools',
    commands: ['livescore', 'skorbola', 'livebola'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, axios } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⚽', key: m.key } }).catch(() => {});
        try {
            const res = await axios.get('https://www.goal.com/id/livescore', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
                    'Accept-Language': 'id-ID,id;q=0.9'
                }
            });
            const match = String(res.data || '').match(/__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!match) return Reply('❌ Gagal membaca data skor dari Goal.com.');
            const json = JSON.parse(match[1]);
            const groups = json?.props?.pageProps?.content?.liveScores || [];
            if (!groups.length) return Reply('⚽ Belum ada jadwal/livescore pertandingan hari ini.');

            const statusMap = {
                FIXTURE: 'Belum Mulai', LIVE: 'LIVE 🔴', FINISHED: 'Selesai',
                POSTPONED: 'Ditunda', CANCELLED: 'Batal', HALF_TIME: 'HT'
            };
            const lines = [];
            let shown = 0;
            for (const g of groups) {
                if (shown >= 10) break;
                const matches = (g.matches || []).slice(0, 4);
                if (!matches.length) continue;
                lines.push(`🏆 *${g.competition?.name || 'Liga'}*`);
                for (const mt of matches) {
                    const sA = typeof mt.score?.teamA === 'object' ? (mt.score.teamA?.current ?? mt.score.teamA?.score ?? '-') : (mt.score?.teamA ?? '-');
                    const sB = typeof mt.score?.teamB === 'object' ? (mt.score.teamB?.current ?? mt.score.teamB?.score ?? '-') : (mt.score?.teamB ?? '-');
                    const st = statusMap[mt.status] || mt.status || '-';
                    lines.push(`◦ ${mt.teamA?.name || '?'} *[${sA} - ${sB}]* ${mt.teamB?.name || '?'} (${st})`);
                }
                lines.push('');
                shown++;
            }
            await Reply(formatCard({
                icon: '⚽',
                title: 'LIVE SCORE SEPAK BOLA',
                body: lines.join('\n').trim(),
                footer: 'Sumber: Goal.com'
            }));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal mengambil livescore: ${e.message}`);
        }
        return true;
    }
};
