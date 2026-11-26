module.exports = {
    name: 'tofigure',
    category: 'maker',
    commands: ['tofigure'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, isPrem, Reply, example, uploadToCDN, axios,
            checkLimit, addLimit
        } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!/image/i.test(mime)) return Reply(example("dengan reply gambar"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏰", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const PROMPT_FIGURE = `Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.`;

        try {
            const userImageBuffer = await q.download();
            if (!userImageBuffer) throw new Error("Gagal mengunduh gambar Anda.");

            const userImageUrl = await uploadToCDN(userImageBuffer, mime);
            if (!userImageUrl) throw new Error("Gagal upload gambar ke server");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/bananaai?apikey=${apiKey}&url=${encodeURIComponent(userImageUrl)}&prompt=${encodeURIComponent(PROMPT_FIGURE)}`;

            const response = await axios.get(apiUrl, {
                responseType: "arraybuffer",
                timeout: 180000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const hasilBuffer = Buffer.from(response.data);

            await Dinz.sendMessage(m.chat, {
                image: hasilBuffer,
                caption: `\`⌜ 3D Action Figure Maker ⌟\`\n> ◦ *Status :* Sukses Dibuat\n> ◦ *Model :* 1/7 Scale PVC Figurine`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});

        } catch (e) {
            console.error('[TOFIGURE ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat figure: ${e.message}`);
        }
        return true;
    }
};
