const { toBoldSans, trimText, formatCard, loadScraper, getQuotedText } = require('./_helper');

module.exports = {
    name: 'bingai',
    category: 'extras',
    commands: ['bingai', 'askbing'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        const prompt = text.trim() || getQuotedText(m);
        if (!prompt) return Reply(example('Apa perbedaan RAM dan ROM?'));
        await Dinz.sendMessage(m.chat, { react: { text: '🧠', key: m.key } }).catch(() => {});
        try {
            const bing = await loadScraper('bing.mjs');
            const res = await bing.askAi(prompt);
            const ans = typeof res === 'string' ? res : (res?.text || res?.answer || '');
            if (!ans) return Reply('❌ Bing AI tidak mengembalikan jawaban.');

            const caption = formatCard({
                icon: '🧠',
                title: 'BING AI',
                body: trimText(ans, 3500),
                footer: `Microsoft Bing AI • ${toBoldSans(global.botname || 'HuTao - MD')}`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Bing AI error: ${e.message}`);
        }
        return true;
    }
};
