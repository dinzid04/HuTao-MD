const { formatCard } = require('./_helper');

module.exports = {
    name: 'rate',
    category: 'fun',
    commands: ['rate'],

    async execute(ctx) {
        const { text, Reply, usedPrefix } = ctx;

        if (!text.trim()) return Reply(`⚠️ Contoh: \`${usedPrefix}rate ketampananku\``);
        const score = Math.floor(Math.random() * 101);
        return Reply(formatCard({
            icon: '⭐',
            title: 'RATING METER',
            rows: [
                { label: 'Pertanyaan', value: text.trim() },
                { label: 'Skor', value: `*${score}/100*` }
            ]
        }));
    }
};
