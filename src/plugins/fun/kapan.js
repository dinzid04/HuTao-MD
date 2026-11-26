module.exports = {
    name: 'kapan',
    category: 'fun',
    commands: ['kapan'],

    async execute(ctx) {
        const { text, Reply, usedPrefix } = ctx;

        if (!text.trim()) return Reply(`⚠️ Contoh: \`${usedPrefix}kapan aku nikah?\``);
        const num = Math.floor(Math.random() * 15) + 1;
        const unit = ['hari', 'minggu', 'bulan', 'tahun'][Math.floor(Math.random() * 4)];
        return Reply(`⏳ *Pertanyaan:* kapan ${text.trim()}\n💬 *Ramalan:* *${num} ${unit} lagi!*`);
    }
};
