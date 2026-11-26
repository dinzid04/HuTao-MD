const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'brat',
    category: 'sticker',
    commands: ['brat'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, sendSelectList, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("halo dunia"));
        }

        const safeText = text.trim();
        if (safeText.length > 100) return Reply("❌ Teks maksimal 100 karakter");

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const captionText = formatCard({
                icon: '✨',
                title: 'BRAT GENERATOR',
                rows: [
                    { label: 'Teks', value: safeText }
                ],
                footer: 'Silakan pilih tipe brat lewat tombol di bawah'
            });

            await sendSelectList({
                title: "Pilih Varian Brat",
                buttonTitle: "List Brat",
                captionText: captionText,
                rows: [
                    { title: "Brat Gambar", description: "Format stiker gambar", id: `bratgambar ${safeText}` },
                    { title: "Brat Gura", description: "Template Gawr Gura", id: `bratgura ${safeText}` },
                    { title: "Brat Anime", description: "Template anime", id: `bratanime ${safeText}` },
                    { title: "Brat HD", description: "Format stiker HD", id: `bratgambarhd ${safeText}` },
                    { title: "Brat Pink", description: "Format stiker pink", id: `bratpink ${safeText}` },
                    { title: "Brat Video", description: "Format stiker animasi", id: `bratvid ${safeText}` }
                ]
            });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('brat error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat brat: ${err.message}`);
        }
        return true;
    }
};
