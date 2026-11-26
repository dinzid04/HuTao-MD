module.exports = {
    name: 'qrcustom',
    category: 'tools',
    commands: ['qrcustom', 'qrcode', 'qr'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ QR Code Generator ⌟\`\n> ◦ *Format :* ${command} <teks> | <hex_color>\n> ◦ *Contoh 1 :* ${command} https://google.com\n> ◦ *Contoh 2 :* ${command} Halo Dunia | #00ff00`);
        }

        let [qrText, qrColor] = text.split('|').map(s => s.trim());
        qrColor = qrColor || '#000000';

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/qr-custom?apikey=${apiKey}&text=${encodeURIComponent(qrText)}&color=${encodeURIComponent(qrColor)}&size=512`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(res.data),
                caption: `\`⌜ QR Code Generated ⌟\`\n> ◦ *Konten :* ${qrText}\n> ◦ *Warna :* ${qrColor}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat QR Code: ${e.message}`);
        }
        return true;
    }
};
