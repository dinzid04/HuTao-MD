module.exports = {
    name: 'emojigif',
    category: 'sticker',
    commands: ['emojigif', 'emojitogif', 'egif'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const rawInput = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!rawInput || rawInput.trim().length === 0) {
            return Reply(
                `\`⌜ Contoh Penggunaan ⌟\`\n> ◦ *Format :* emojigif <emoji>\n> ◦ *Contoh :* emojigif 😂\n> ◦ *Contoh 2 :* emojigif ❤️`
            );
        }

        const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
        const matches = rawInput.match(emojiRegex);
        const targetEmoji = (matches && matches.length > 0) ? matches[0] : rawInput.trim();

        if (!targetEmoji) {
            return Reply(`❌ Masukkan emoji yang ingin diubah menjadi stiker animasi!\nContoh: *emojigif 😂*`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/emojigif?apikey=${apiKey}&emoji=${encodeURIComponent(targetEmoji)}`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const webpBuffer = Buffer.from(res.data);
            if (!webpBuffer || webpBuffer.length === 0) {
                throw new Error("Gagal mengambil stiker animasi emoji");
            }

            await Dinz.sendAsSticker(m.chat, webpBuffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('emojigif error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat animasi emoji: Emoji *${targetEmoji}* tidak tersedia dalam format animasi Google Noto.`);
        }
        return true;
    }
};
