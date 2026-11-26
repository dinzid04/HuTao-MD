const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'yttranscript',
    category: 'extras',
    commands: ['yttranscript', 'transkripyt', 'yttext'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        if (!text || !/youtu\.?be/i.test(text)) {
            return Reply(example('https://youtu.be/dQw4w9WgXcQ'));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '📜', key: m.key } }).catch(() => {});
        try {
            const tt = await loadScraper('transcribetube.mjs');
            const res = await tt.transcript(text.trim());
            const transcriptText = typeof res === 'string' ? res : (res?.transcript || res?.text || '');
            if (!transcriptText) return Reply('❌ Video ini tidak memiliki transkrip/subtitle.');

            const caption = formatCard({
                icon: '📜',
                title: 'YOUTUBE TRANSCRIPT',
                rows: [
                    { label: 'Video ID', value: `\`${res?.videoId || '-'}\`` },
                    { label: 'Panjang', value: `${transcriptText.length} karakter` }
                ],
                body: trimText(transcriptText, 3200),
                footer: transcriptText.length > 3200 ? 'Teks dipotong agar muat di WhatsApp' : 'Transkrip lengkap berhasil diambil'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal mengambil transkrip YouTube: ${e.message}`);
        }
        return true;
    }
};
