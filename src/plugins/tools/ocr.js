module.exports = {
    name: 'ocr',
    category: 'tools',
    commands: ['ocr', 'imagetotext', 'itt'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, mime, qmsg, isCreator, Reply, uploadToCDN, axios,
            checkLimit, addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isImage = /image/i.test(mime) || m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');
        if (!isImage) {
            return Reply(`\`⌜ Scan OCR ⌟\`\n> ◦ *Format :* reply foto dengan ${command}`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let mediaBuffer = null;
            if (typeof qmsg.download === 'function') {
                mediaBuffer = await qmsg.download();
            } else if (typeof quoted.download === 'function') {
                mediaBuffer = await quoted.download();
            } else if (typeof m.download === 'function') {
                mediaBuffer = await m.download();
            } else {
                mediaBuffer = await Dinz.downloadMediaMessage(quoted || m);
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error("Gagal mengunduh gambar.");
            }

            const cdnUrl = await uploadToCDN(mediaBuffer, mime || 'image/jpeg');
            if (!cdnUrl) throw new Error("Gagal mengupload gambar ke CDN");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            const res = await axios.get(`${baseUrl}/tools/ocr?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}`, {
                timeout: 35000
            });

            const ocrResult = res.data?.result;
            if (!ocrResult || ocrResult.trim().length === 0) {
                throw new Error("Teks tidak dapat dideteksi pada gambar.");
            }

            const replyMsg = `\`⌜ Hasil Scan OCR ⌟\`\n\n${ocrResult.trim()}`;
            await Reply(replyMsg);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('OCR Error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal OCR: ${err.response?.data?.error || err.message}`);
        }
        return true;
    }
};
