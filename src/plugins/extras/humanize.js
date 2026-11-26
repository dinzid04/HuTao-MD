const { trimText, formatCard, loadScraper, getQuotedText } = require('./_helper');

module.exports = {
    name: 'humanize',
    category: 'extras',
    commands: ['humanize', 'humanizer'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        const input = text.trim() || getQuotedText(m);
        if (!input || input.length < 15) {
            return Reply(example('<teks buatan AI yang mau diperhalus>\n> Atau reply pesan teks.'));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '✍️', key: m.key } }).catch(() => {});
        try {
            const dc = await loadScraper('deepchat.mjs');
            const res = await dc.humanize(input);
            const out = typeof res === 'string' ? res : (res?.humanizedText || res?.text || res?.result || '');
            if (!out) return Reply('❌ Gagal memproses AI Humanizer.');

            const caption = formatCard({
                icon: '✍️',
                title: 'AI HUMANIZER',
                body: trimText(out, 3500),
                footer: `Teks telah dipoles agar terasa lebih natural`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ AI Humanizer error: ${e.message}`);
        }
        return true;
    }
};
