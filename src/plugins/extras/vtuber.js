const { trimText, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'vtuber',
    category: 'extras',
    commands: ['vtuber', 'vtubersearch'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, example } = ctx;

        if (!text) return Reply(example('Kobo Kanaeru'));
        await Dinz.sendMessage(m.chat, { react: { text: '🌟', key: m.key } }).catch(() => {});
        try {
            const vt = await loadScraper('vtuberspace.mjs');
            const res = await vt.searchVtuber(text.trim(), 5);
            const list = res?.data || (Array.isArray(res) ? res : []);
            if (!list.length) return Reply(`❌ VTuber *${text.trim()}* tidak ditemukan.`);

            const v = list[0];
            const others = list.slice(1, 5).map((o) => `• ${o.name}`).join('\n');

            const caption = formatCard({
                icon: '🌟',
                title: 'VTUBER PROFILE',
                rows: [
                    { label: 'Nama', value: `*${v.name || '-'}*` },
                    { label: 'Nama Asli', value: v.original_name || '' },
                    { label: 'Agensi', value: v.agency?.name || v.agency_name || '' },
                    { label: 'Debut', value: v.debut_date || '' },
                    { label: 'Status', value: v.status || '' }
                ],
                body:
                    (v.bio ? `*Bio:*\n_${trimText(v.bio, 600)}_` : '') +
                    (others ? `\n\n*Hasil Lain:*\n${others}` : ''),
                footer: 'Sumber: VTuber Space Indonesia'
            });

            const avatar = await fetchImageBufferSafe(v.avatar);
            if (avatar) {
                await Dinz.sendMessage(m.chat, { image: avatar, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ VTuber Search error: ${e.message}`);
        }
        return true;
    }
};
