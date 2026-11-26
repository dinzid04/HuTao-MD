module.exports = {
    name: 'apakah',
    category: 'fun',
    commands: ['apakah', 'bisakah', 'haruskah', 'akankah'],

    async execute(ctx) {
        const { command, text, Reply, usedPrefix } = ctx;

        if (!text.trim()) return Reply(`⚠️ Tulis pertanyaanmu! Contoh: \`${usedPrefix}${command} aku bisa kaya?\``);
        const pool = ['Ya, tentu saja!', 'Kemungkinan besar iya.', 'Bisa jadi.', 'Sepertinya tidak.', 'Jangan berharap terlalu banyak.', 'Coba tanya lagi nanti.', 'Pasti bisa, semangat!'];
        const ans = pool[Math.floor(Math.random() * pool.length)];
        return Reply(`🔮 *Pertanyaan:* ${command} ${text.trim()}\n💬 *Jawaban:* *${ans}*`);
    }
};
