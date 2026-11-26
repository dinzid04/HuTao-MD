const { formatCard, loadScraper, getQuotedText } = require('./_helper');

module.exports = {
    name: 'ringkas',
    category: 'extras',
    commands: ['ringkas', 'summarize', 'summary'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        const sourceText = text.trim() || getQuotedText(m);
        if (!sourceText || sourceText.length < 40) {
            return Reply(example('<teks panjang minimal 40 karakter>\n> Atau reply pesan panjang dengan perintah ini.'));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '📝', key: m.key } }).catch(() => {});
        try {
            const sum = await loadScraper('summarizerorg.mjs');
            const res = await sum.summarize(sourceText);
            const resultText = typeof res === 'string' ? res : (res?.summary || res?.text || '');
            if (!resultText) return Reply('❌ Gagal meringkas teks.');

            const caption = formatCard({
                icon: '📝',
                title: 'AI SUMMARIZER',
                rows: [
                    { label: 'Panjang Asli', value: `${sourceText.length} karakter` },
                    { label: 'Ringkasan', value: `${resultText.length} karakter` }
                ],
                body: resultText,
                footer: `Ringkasan otomatis • ${global.botname || 'HuTao - MD'}`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal meringkas: ${e.message}`);
        }
        return true;
    }
};
