const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'harilibur',
    category: 'tools',
    commands: ['harilibur', 'libur', 'harinasional'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, axios } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '📅', key: m.key } }).catch(() => {});
        try {
            let body = '';
            try {
                const { data } = await axios.get('https://api.nexray.eu.cc/information/hari-libur', { timeout: 12000 });
                const r = data?.result;
                if (data?.status && r?.mendatang) {
                    const libur = (r.mendatang.hari_libur || []).slice(0, 6);
                    const nas = (r.mendatang.event_nasional || []).slice(0, 5);
                    if (libur.length) {
                        body += '*Hari Libur Mendatang:*\n' + libur.map((x) => `◦ ${x.date}: ${x.event} (${x.daysUntil} hari lagi)`).join('\n');
                    }
                    if (nas.length) {
                        body += `${body ? '\n\n' : ''}*Hari Nasional Mendatang:*\n` + nas.map((x) => `◦ ${x.date}: ${x.event} (${x.daysUntil} hari lagi)`).join('\n');
                    }
                }
            } catch (_) {}

            if (!body) {
                const yr = new Date().getFullYear();
                const { data } = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${yr}/ID`, { timeout: 12000 });
                const todayIso = new Date().toISOString().slice(0, 10);
                const upcoming = (Array.isArray(data) ? data : []).filter((h) => h.date >= todayIso).slice(0, 10);
                body = upcoming.map((h) => `◦ ${h.date}: ${h.localName || h.name}`).join('\n');
            }

            if (!body) return Reply('❌ Data hari libur tidak tersedia saat ini.');
            await Reply(formatCard({ icon: '📅', title: 'HARI LIBUR & NASIONAL', body }));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal mengambil data hari libur: ${e.message}`);
        }
        return true;
    }
};
