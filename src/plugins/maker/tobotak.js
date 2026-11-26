module.exports = {
    name: 'tobotak',
    category: 'maker',
    commands: ['tobotak', 'botak'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, example, uploadToCDN, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!/image/i.test(mime)) return Reply(example("dengan reply gambar"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏰", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const PROMPT_BOTAK = `Make the person completely bald, smooth shaved clean scalp, realistic head shape, keep original face, facial features, and expression identical, photorealistic portrait.`;

        try {
            const userImageBuffer = await q.download();
            if (!userImageBuffer) throw new Error("Gagal mengunduh gambar Anda.");

            const userImageUrl = await uploadToCDN(userImageBuffer, mime);
            if (!userImageUrl) throw new Error("Gagal upload gambar ke server");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/bananaai?apikey=${apiKey}&url=${encodeURIComponent(userImageUrl)}&prompt=${encodeURIComponent(PROMPT_BOTAK)}`;

            const response = await axios.get(apiUrl, {
                responseType: "arraybuffer",
                timeout: 180000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const hasilBuffer = Buffer.from(response.data);

            await Dinz.sendMessage(m.chat, {
                image: hasilBuffer,
                caption: `\`⌜ To Botak AI ⌟\`\n> ◦ *Status :* Sukses Dibuat\n> ◦ *Efek :* Kepala Botak Realistis`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});

        } catch (e) {
            console.error('[TOBOTAK ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengedit foto: ${e.message}`);
        }
        return true;
    }
};
