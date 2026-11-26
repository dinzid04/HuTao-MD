const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'vtubernews',
    category: 'extras',
    commands: ['vtubernews', 'beritavtuber'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '📰', key: m.key } }).catch(() => {});
        try {
            const vt = await loadScraper('vtuberspace.mjs');
            const res = await vt.getLatestNews(6);
            const list = res?.data || (Array.isArray(res) ? res : []);
            if (!list.length) return Reply('❌ Belum ada berita VTuber terbaru.');

            const bodyList = list.map((n, i) => (
                `*${i + 1}. ${n.title || '-'}*\n` +
                `   ↳ _${trimText(n.excerpt || n.summary || '-', 120)}_`
            )).join('\n\n');

            const caption = formatCard({
                icon: '📰',
                title: 'BERITA VTUBER TERBARU',
                body: bodyList,
                footer: 'Sumber: VTuber Space Indonesia'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ VTuber News error: ${e.message}`);
        }
        return true;
    }
};
