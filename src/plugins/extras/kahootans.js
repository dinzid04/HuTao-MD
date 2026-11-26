const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'kahootans',
    category: 'extras',
    commands: ['kahootans', 'kuncikahoot'],

    async execute(ctx) {
        const { Dinz, m, text, q, body, Reply, example } = ctx;

        if (!text) return Reply(example('<uuid_atau_link_kahoot>'));
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        try {
            const kh = await loadScraper('kahoot.mjs');
            const res = await kh.getQuizAnswers(text.trim());
            const questions = res?.questions || [];
            if (!questions.length) return Reply('❌ Soal/kunci jawaban kuis tidak ditemukan (mungkin privat).');

            const bodyList = questions.slice(0, 15).map((q, i) => {
                const correct = (q.choices || [])
                    .filter((c) => c.correct)
                    .map((c) => String(c.answer || '').replace(/<[^>]+>/g, ''))
                    .join(', ') || '-';
                const cleanQ = String(q.question || '').replace(/<[^>]+>/g, '');
                return `*${i + 1}.* ${cleanQ}\n   ✅ *Jawaban:* \`${correct}\``;
            }).join('\n\n');

            const caption = formatCard({
                icon: '✅',
                title: 'KAHOOT ANSWERS',
                rows: [
                    { label: 'Judul Kuis', value: `*${res.title || '-'}*` },
                    { label: 'Total Soal', value: `${questions.length} Soal` }
                ],
                body: trimText(bodyList, 3300),
                footer: questions.length > 15 ? `Menampilkan 15 dari ${questions.length} soal` : 'Semua soal berhasil diekstrak'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Kahoot Answers error: ${e.message}`);
        }
        return true;
    }
};
