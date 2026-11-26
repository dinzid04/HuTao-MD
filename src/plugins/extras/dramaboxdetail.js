const { trimText, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'dramaboxdetail',
    category: 'extras',
    commands: ['dramaboxdetail', 'dbdetail'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, example } = ctx;

        if (!text) return Reply(example('42000033112'));
        await Dinz.sendMessage(m.chat, { react: { text: '🎞️', key: m.key } }).catch(() => {});
        try {
            const dbx = await loadScraper('dramabox.mjs');
            const res = await dbx.detail({ bookId: text.trim(), lang: 'in' });
            const b = res?.book || res;
            if (!b?.title) return Reply('❌ Detail drama tidak ditemukan.');

            const tags = Array.isArray(b.tags) ? b.tags.join(', ') : (Array.isArray(b.tagNames) ? b.tagNames.join(', ') : '');
            const caption = formatCard({
                icon: '🎞️',
                title: 'DETAIL DRAMABOX',
                rows: [
                    { label: 'Judul', value: `*${b.title}*` },
                    { label: 'Book ID', value: `\`${b.bookId || text.trim()}\`` },
                    { label: 'Episode', value: b.chapterCount ? `${b.chapterCount} Episode` : '-' },
                    { label: 'Tag / Genre', value: tags }
                ],
                body: `*Sinopsis:*\n_${trimText(b.introduction || b.synopsis || b.desc || '-', 900)}_`,
                footer: 'DramaBox Indonesia'
            });

            const cover = await fetchImageBufferSafe(b.cover);
            if (cover) {
                await Dinz.sendMessage(m.chat, { image: cover, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ DramaBox Detail error: ${e.message}`);
        }
        return true;
    }
};
