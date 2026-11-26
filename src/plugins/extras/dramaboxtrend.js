const { formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'dramaboxtrend',
    category: 'extras',
    commands: ['dramaboxtrend', 'dbtrend'],

    async execute(ctx) {
        const { Dinz, m, args, text, body, quoted, Reply, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        await Dinz.sendMessage(m.chat, { react: { text: '🔥', key: m.key } }).catch(() => {});
        try {
            const dbx = await loadScraper('dramabox.mjs');
            const res = await dbx.browse({ lang: 'in', page: parseInt(args[0], 10) || 1 });
            const books = res?.books || [];
            if (!books.length) return Reply('❌ Gagal memuat daftar trending DramaBox.');

            const top = books[0];
            const bodyList = books.slice(0, 8).map((b, i) => (
                `*${i + 1}. ${b.title || '-'}*\n` +
                `   ↳ ID: \`${b.bookId}\`${b.chapterCount ? ` | 🎞️ ${b.chapterCount} Eps` : ''}`
            )).join('\n\n');

            const caption = formatCard({
                icon: '🔥',
                title: 'DRAMABOX TRENDING',
                rows: [
                    { label: 'Halaman', value: `${res.page || 1} / ${res.totalPages || 1}` }
                ],
                body: bodyList,
                footer: `Ketik ${pref}dramaboxdetail ${top.bookId} untuk melihat sinopsis`
            });

            const cover = await fetchImageBufferSafe(top.cover);
            if (cover) {
                await Dinz.sendMessage(m.chat, { image: cover, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ DramaBox Trending error: ${e.message}`);
        }
        return true;
    }
};
