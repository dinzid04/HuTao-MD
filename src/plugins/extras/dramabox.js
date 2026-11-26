const { formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'dramabox',
    category: 'extras',
    commands: ['dramabox', 'dbsearch'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, example, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        if (!text) return Reply(example('CEO'));
        await Dinz.sendMessage(m.chat, { react: { text: '🎬', key: m.key } }).catch(() => {});
        try {
            const dbx = await loadScraper('dramabox.mjs');
            const res = await dbx.search({ keyword: text.trim(), lang: 'in' });
            const books = res?.books || [];
            if (!books.length) return Reply(`❌ Drama *${text.trim()}* tidak ditemukan di DramaBox.`);

            const top = books[0];
            const bodyList = books.slice(0, 6).map((b, i) => (
                `*${i + 1}. ${b.title || b.name || '-'}*\n` +
                `   ↳ Book ID: \`${b.bookId}\`${b.chapterCount ? ` | 🎞️ ${b.chapterCount} Eps` : ''}`
            )).join('\n\n');

            const caption = formatCard({
                icon: '🎬',
                title: 'DRAMABOX SEARCH',
                rows: [
                    { label: 'Kata Kunci', value: text.trim() },
                    { label: 'Total Hasil', value: `${res.total || books.length} drama` }
                ],
                body: bodyList,
                footer: `Ketik ${pref}dramaboxdetail ${top.bookId} untuk sinopsis lengkap`
            });

            const cover = await fetchImageBufferSafe(top.cover);
            if (cover) {
                await Dinz.sendMessage(m.chat, { image: cover, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ DramaBox error: ${e.message}`);
        }
        return true;
    }
};
