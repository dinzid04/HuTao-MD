module.exports = {
    name: 'pinterest',
    category: 'search',
    commands: ['pinterest', 'pin', 'pinterestsearch', 'pinsearch'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("anime aesthetic"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/search/pinterest?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`;
            const response = await axios.get(apiUrl, { timeout: 25000 });
            const json = response.data;

            if (!json.status || !Array.isArray(json.result) || json.result.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tidak ditemukan gambar Pinterest untuk kata kunci "${text.trim()}".`);
            }

            const validImages = json.result.filter(u => typeof u === 'string' && u.startsWith('http'));
            if (validImages.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal memuat gambar dari Pinterest.`);
            }

            const selectedImages = validImages.slice(0, 5);
            const captionText = `\`⌜ Pinterest Search ⌟\`\n> ◦ *Query :* ${text.trim()}\n> ◦ *Total Hasil :* ${selectedImages.length} Gambar`;

            if (selectedImages.length > 1) {
                const albumItems = selectedImages.map((imgUrl, idx) => ({
                    image: { url: imgUrl },
                    ...(idx === 0 ? { caption: captionText } : {})
                }));

                await Dinz.sendMessage(m.chat, {
                    albumMessage: albumItems
                }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, {
                    image: { url: selectedImages[0] },
                    caption: captionText
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('pinterest error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mencari di Pinterest: ${err?.message}`);
        }
        return true;
    }
};
