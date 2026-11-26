const { formatCard, cleanNum } = require('./_helper');

module.exports = {
    name: 'soulmatch',
    category: 'fun',
    commands: ['soulmatch'],

    async execute(ctx) {
        const { m, text, Reply } = ctx;

        const parts = text.split(/[,|&+]/).map((s) => s.trim()).filter(Boolean);
        const n1 = parts[0] || m.pushName || 'Kamu';
        const n2 = parts[1] || (m.mentionedJid?.[0] ? `@${cleanNum(m.mentionedJid[0])}` : 'Gebetanmu');
        const seed = [...(n1 + n2).toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0);
        const score = (seed * 37) % 101;
        const bar = '❤️'.repeat(Math.round(score / 20)) + '🤍'.repeat(5 - Math.round(score / 20));
        const verdict = score >= 80 ? 'Jodoh dunia akhirat!' : score >= 55 ? 'Cocok banget, tinggal gas!' : score >= 30 ? 'Butuh pendekatan lebih dalam.' : 'Mungkin lebih cocok jadi teman.';
        return Reply(formatCard({
            icon: '💞',
            title: 'SOULMATCH CHECK',
            rows: [
                { label: 'Pasangan', value: `${n1} & ${n2}` },
                { label: 'Kecocokan', value: `*${score}%* ${bar}` },
                { label: 'Kesimpulan', value: verdict }
            ]
        }), m.mentionedJid || []);
    }
};
