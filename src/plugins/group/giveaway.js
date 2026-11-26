const { formatCard } = require('./_helper');

module.exports = {
    name: 'giveaway',
    category: 'group',
    commands: ['giveaway', 'ga'],

    async execute(ctx) {
        const { body, Reply, usedPrefix } = ctx;

        return Reply(formatCard({
            icon: '🎁',
            title: 'GIVEAWAY MANAGER',
            body: `◦ \`${usedPrefix}gacreate Judul | Durasi | Pemenang | Hadiah\`\n  Contoh: \`${usedPrefix}gacreate Bagi Saldo | 30m | 2 | DANA 50k\`\n◦ \`${usedPrefix}gajoin <ID>\` - Ikut giveaway\n◦ \`${usedPrefix}galist\` - Daftar giveaway\n◦ \`${usedPrefix}gaend <ID>\` - Akhiri & undi sekarang\n◦ \`${usedPrefix}gareroll <ID>\` - Undi ulang pemenang\n◦ \`${usedPrefix}gadelete <ID>\` - Hapus giveaway`
        }));
    }
};
