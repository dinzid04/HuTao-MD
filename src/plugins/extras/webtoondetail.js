const { trimText, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'webtoondetail',
    category: 'extras',
    commands: ['webtoondetail', 'wtdetail'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, example } = ctx;

        if (!text) return Reply(example('532'));
        await Dinz.sendMessage(m.chat, { react: { text: '📖', key: m.key } }).catch(() => {});
        try {
            const wt = await loadScraper('webtoon.mjs');
            const d = await wt.getDetail(text.trim());
            if (!d?.title) return Reply('❌ Detail Webtoon tidak ditemukan.');

            const caption = formatCard({
                icon: '📖',
                title: 'DETAIL WEBTOON',
                rows: [
                    { label: 'Judul', value: `*${d.title}*` },
                    { label: 'ID', value: `\`${d.titleNo || text.trim()}\`` },
                    { label: 'Genre', value: d.genre || '-' },
                    { label: 'Author', value: Array.isArray(d.authors) ? d.authors.join(', ') : (d.author || '-') },
                    { label: 'Bahasa', value: d.language || '-' }
                ],
                body: `*Sinopsis:*\n_${trimText(d.synopsis || '-', 800)}_`,
                footer: 'LINE Webtoon Indonesia'
            });

            const thumb = await fetchImageBufferSafe(d.thumbnail);
            if (thumb) {
                await Dinz.sendMessage(m.chat, { image: thumb, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ Webtoon Detail error: ${e.message}`);
        }
        return true;
    }
};
