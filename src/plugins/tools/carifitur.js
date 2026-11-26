const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'carifitur',
    category: 'tools',
    commands: ['carifitur', 'searchfitur', 'cekfitur'],

    async execute(ctx) {
        const { text, body, Reply, validCommandsList, usedPrefix } = ctx;

        const q = text.trim().toLowerCase();
        if (!q) return Reply(`🔍 Cari command bot.\nContoh: \`${usedPrefix}carifitur lid\``);
        const hits = (validCommandsList || []).filter((c) => c.includes(q)).slice(0, 40);
        if (!hits.length) return Reply(`❌ Tidak ada command yang cocok dengan kata kunci *${q}*.`);
        return Reply(formatCard({
            icon: '🔍',
            title: `HASIL CARI FITUR (${hits.length})`,
            body: hits.map((c) => `◦ \`${usedPrefix}${c}\``).join('\n')
        }));
    }
};
