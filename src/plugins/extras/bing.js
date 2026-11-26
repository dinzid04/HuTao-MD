const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'bing',
    category: 'extras',
    commands: ['bing', 'bingsearch'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        if (!text) return Reply(example('berita teknologi hari ini'));
        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        try {
            const bing = await loadScraper('bing.mjs');
            const res = await bing.search(text.trim());
            const list = Array.isArray(res) ? res : (res?.results || []);
            if (!list.length) return Reply(`❌ Hasil pencarian untuk *${text.trim()}* tidak ditemukan.`);

            const bodyList = list.slice(0, 6).map((item, i) => (
                `*${i + 1}. ${item.title || '-'}*\n` +
                `   ↳ _${trimText(item.snippet || '-', 120)}_\n` +
                `   ↳ 🔗 ${item.url || '-'}`
            )).join('\n\n');

            const caption = formatCard({
                icon: '🔎',
                title: 'BING WEB SEARCH',
                rows: [{ label: 'Query', value: text.trim() }],
                body: bodyList,
                footer: 'Microsoft Bing Search'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Bing Search error: ${e.message}`);
        }
        return true;
    }
};
