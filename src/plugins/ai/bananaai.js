module.exports = {
    name: 'bananaai',
    category: 'ai',
    commands: ['bananaai', 'banana', 'editfoto', 'aiedit', 'imgai', 'editai'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, isPrem, Reply, uploadToCDN, axios,
            checkLimit, addLimit
        } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        const promptTeks = text ? text.trim() : (q.text ? q.text.trim() : '');

        if (!/image/.test(mime)) {
            return Reply(`📌 *Kirim atau balas (reply) foto dengan caption:* ${command} <instruksi>\n> *Contoh:* ${command} ubah jadi anime 4k`);
        }

        if (!promptTeks) {
            return Reply(`📌 Masukkan instruksi edit foto!\n> *Contoh:* ${command} ubah jadi hd 4k`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const userImageBuffer = await q.download();
            if (!userImageBuffer) throw new Error("Gagal mengunduh gambar.");

            const userImageUrl = await uploadToCDN(userImageBuffer, mime);
            if (!userImageUrl) throw new Error("Gagal mengunggah gambar ke server CDN.");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/bananaai?apikey=${apiKey}&url=${encodeURIComponent(userImageUrl)}&prompt=${encodeURIComponent(promptTeks)}`;

            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 180000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const hasilBuffer = Buffer.from(response.data);

            await Dinz.sendMessage(m.chat, {
                image: hasilBuffer,
                caption: `\`⌜ Banana AI Edit Foto ⌟\`\n> ◦ *Prompt :* ${promptTeks}\n> ◦ *Status :* Sukses diedit`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Banana AI error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mengedit foto dengan AI: ${err?.message}`);
        }
        return true;
    }
};
