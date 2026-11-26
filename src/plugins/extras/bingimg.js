const { trimText, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'bingimg',
    category: 'extras',
    commands: ['bingimg', 'bingimage'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, Reply, example } = ctx;

        if (!text) return Reply(example('cyberpunk anime wallpaper'));
        await Dinz.sendMessage(m.chat, { react: { text: '🖼️', key: m.key } }).catch(() => {});
        try {
            const bing = await loadScraper('bing.mjs');
            const res = await bing.searchImages(text.trim());
            const list = Array.isArray(res) ? res : (res?.results || []);
            if (!list.length) return Reply(`❌ Gambar untuk *${text.trim()}* tidak ditemukan.`);

            const pick = list[Math.floor(Math.random() * Math.min(list.length, 6))];
            const imgUrl = pick.url || pick.imageUrl || pick.thumbnailUrl;
            const imgBuf = (await fetchImageBufferSafe(imgUrl)) || (await fetchImageBufferSafe(pick.thumbnailUrl));

            const caption = formatCard({
                icon: '🖼️',
                title: 'BING IMAGE',
                rows: [
                    { label: 'Pencarian', value: text.trim() },
                    { label: 'Judul', value: trimText(pick.title || '-', 90) }
                ],
                footer: 'Microsoft Bing Images'
            });

            if (imgBuf) {
                await Dinz.sendMessage(m.chat, { image: imgBuf, caption }, { quoted: m });
            } else if (imgUrl) {
                await Dinz.sendMessage(m.chat, { image: { url: imgUrl }, caption }, { quoted: m });
            } else {
                await Reply('❌ Gagal mengunduh gambar.');
            }
        } catch (e) {
            return Reply(`❌ Bing Image error: ${e.message}`);
        }
        return true;
    }
};
