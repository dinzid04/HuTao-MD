const { formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'kahoot',
    category: 'extras',
    commands: ['kahoot', 'kahootsearch'],

    async execute(ctx) {
        const { Dinz, m, text, q, body, Reply, example, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        if (!text) return Reply(example('Sejarah Indonesia'));
        await Dinz.sendMessage(m.chat, { react: { text: '🎯', key: m.key } }).catch(() => {});
        try {
            const kh = await loadScraper('kahoot.mjs');
            const res = await kh.searchQuiz(text.trim(), { limit: 6 });
            const list = Array.isArray(res) ? res : (res?.results || res?.quizzes || []);
            if (!list.length) return Reply(`❌ Kuis Kahoot *${text.trim()}* tidak ditemukan.`);

            const bodyList = list.slice(0, 6).map((q, i) => (
                `*${i + 1}. ${q.title || '-'}*\n` +
                `   ↳ UUID: \`${q.uuid || q.id}\`\n` +
                `   ↳ Kreator: ${q.creator_username || '-'}${q.number_of_questions ? ` | ${q.number_of_questions} Soal` : ''}`
            )).join('\n\n');

            const caption = formatCard({
                icon: '🎯',
                title: 'KAHOOT SEARCH',
                rows: [
                    { label: 'Pencarian', value: text.trim() }
                ],
                body: bodyList,
                footer: `Ketik ${pref}kahootans ${list[0].uuid || list[0].id} untuk lihat kunci jawaban`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Kahoot Search error: ${e.message}`);
        }
        return true;
    }
};
