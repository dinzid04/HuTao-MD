const { trimText, formatCard, loadScraper, getQuotedText } = require('./_helper');

module.exports = {
    name: 'deepchat',
    category: 'extras',
    commands: ['deepchat', 'dchat'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        const prompt = text.trim() || getQuotedText(m);
        if (!prompt) return Reply(example('Jelaskan cara kerja black hole secara singkat'));

        await Dinz.sendMessage(m.chat, { react: { text: '🤖', key: m.key } }).catch(() => {});
        try {
            const dc = await loadScraper('deepchat.mjs');
            const res = await dc.chat(prompt);
            const answer = typeof res === 'string' ? res : (res?.text || res?.reply || res?.content || '');
            if (!answer) return Reply('❌ AI tidak mengembalikan jawaban.');

            const caption = formatCard({
                icon: '🤖',
                title: 'DEEPCHAT AI',
                body: trimText(answer, 3500),
                footer: `DeepChat Assistant • ${global.botname || 'HuTao - MD'}`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ DeepChat error: ${e.message}`);
        }
        return true;
    }
};
