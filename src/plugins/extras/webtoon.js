const { formatNumber, trimText, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'webtoon',
    category: 'extras',
    commands: ['webtoon', 'wtsearch'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, example, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        if (!text) return Reply(example('Lookism'));
        await Dinz.sendMessage(m.chat, { react: { text: '📚', key: m.key } }).catch(() => {});
        try {
            const wt = await loadScraper('webtoon.mjs');
            const res = await wt.search(text.trim());
            const list = Array.isArray(res) ? res : (res?.results || res?.items || []);
            if (!list.length) return Reply(`❌ Webtoon *${text.trim()}* tidak ditemukan.`);

            const top = list[0];
            const bodyList = list.slice(0, 6).map((item, idx) => (
                `*${idx + 1}. ${item.title || '-'}*\n` +
                `   ↳ ID: \`${item.titleNo || '-'}\` | 👁️ ${formatNumber(item.readCount || 0)} | ❤️ ${formatNumber(item.favoriteCount || 0)}\n` +
                `   ↳ _${trimText(item.synopsis || '-', 110)}_`
            )).join('\n\n');

            const caption = formatCard({
                icon: '📚',
                title: 'LINE WEBTOON',
                rows: [
                    { label: 'Pencarian', value: text.trim() },
                    { label: 'Ditemukan', value: `${list.length} judul` }
                ],
                body: bodyList,
                footer: `Ketik ${pref}webtoondetail ${top.titleNo} untuk info detail lengkap`
            });

            const thumb = await fetchImageBufferSafe(top.thumbnail);
            if (thumb) {
                await Dinz.sendMessage(m.chat, { image: thumb, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }
        } catch (e) {
            return Reply(`❌ Webtoon error: ${e.message}`);
        }
        return true;
    }
};
