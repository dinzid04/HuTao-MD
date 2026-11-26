const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'jooxlirik',
    category: 'extras',
    commands: ['jooxlirik', 'lirikjoox'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        if (!text) return Reply(example('Komang'));
        await Dinz.sendMessage(m.chat, { react: { text: '🎤', key: m.key } }).catch(() => {});
        try {
            const joox = await loadScraper('joox.mjs');
            const results = await joox.search(text.trim());
            const list = Array.isArray(results) ? results : (results?.results || []);
            if (!list.length) return Reply(`❌ Lagu *${text.trim()}* tidak ditemukan di JOOX.`);

            const track = list[0];
            const lyr = await joox.getLyrics(track.id);
            const lines = Array.isArray(lyr)
                ? lyr.map((l) => (typeof l === 'string' ? l : l.text)).filter((t) => t && t.trim())
                : (typeof lyr === 'string' ? [lyr] : []);

            if (!lines.length) return Reply(`❌ Lirik tidak tersedia untuk lagu *${track.name}*.`);

            const artistNames = Array.isArray(track.artists)
                ? track.artists.map((a) => a.name).filter(Boolean).join(', ')
                : '-';

            const caption = formatCard({
                icon: '🎤',
                title: 'JOOX LYRICS',
                rows: [
                    { label: 'Judul', value: `*${track.name}*` },
                    { label: 'Artis', value: artistNames }
                ],
                body: trimText(lines.join('\n'), 3200),
                footer: 'Lirik diambil langsung dari JOOX'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ JOOX Lirik error: ${e.message}`);
        }
        return true;
    }
};
