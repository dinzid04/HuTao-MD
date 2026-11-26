module.exports = {
    name: 'dimana',
    category: 'fun',
    commands: ['dimana'],

    async execute(ctx) {
        const { text, Reply, usedPrefix } = ctx;

        if (!text.trim()) return Reply(`⚠️ Contoh: \`${usedPrefix}dimana jodohku?\``);
        const places = ['Di dekatmu!', 'Di kota sebelah', 'Lagi otw ke hatimu', 'Di minimarket terdekat', 'Di grup ini juga kayaknya 👀', 'Masih disembunyikan semesta'];
        return Reply(`📍 *Pertanyaan:* dimana ${text.trim()}\n💬 *Jawaban:* *${places[Math.floor(Math.random() * places.length)]}*`);
    }
};
