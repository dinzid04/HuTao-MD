module.exports = {
    name: 'emojimix',
    category: 'sticker',
    commands: ['emojimix', 'mixemoji', 'emix'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const rawInput = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!rawInput || rawInput.trim().length === 0) {
            return Reply(
                `\`⌜ Contoh Penggunaan ⌟\`\n> ◦ *Format :* emojimix <emoji1>+<emoji2>\n> ◦ *Contoh :* emojimix 😎+😂\n> ◦ *Contoh 2 :* emojimix 🥺👉`
            );
        }

        let emoji1 = null;
        let emoji2 = null;
        const trimmed = rawInput.trim();

        if (trimmed.includes('+')) {
            const parts = trimmed.split('+').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                emoji1 = parts[0];
                emoji2 = parts[1];
            }
        } else if (trimmed.includes('|')) {
            const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                emoji1 = parts[0];
                emoji2 = parts[1];
            }
        } else if (trimmed.includes(' ')) {
            const parts = trimmed.split(/\s+/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                emoji1 = parts[0];
                emoji2 = parts[1];
            }
        } else {
            const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
            const matches = trimmed.match(emojiRegex);
            if (matches && matches.length >= 2) {
                emoji1 = matches[0];
                emoji2 = matches[1];
            }
        }

        if (!emoji1 || !emoji2) {
            return Reply(`❌ Masukkan minimal 2 emoji yang ingin digabungkan!\nContoh: *emojimix 😎+😂*`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/emojimix?apikey=${apiKey}&emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const imgBuffer = Buffer.from(res.data);
            if (!imgBuffer || imgBuffer.length === 0) {
                throw new Error("Gagal membuat sticker emojimix");
            }

            await Dinz.sendAsSticker(m.chat, imgBuffer, m, { packname: global.packname, author: global.namaOwner });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('emojimix error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal menggabungkan emoji: Kombinasi *${emoji1}* + *${emoji2}* tidak didukung oleh database emoji.`);
        }
        return true;
    }
};
