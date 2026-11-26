module.exports = {
    name: 'toprompt',
    category: 'tools',
    commands: ['toprompt', 'img2prompt', 'image2prompt', 'promptimg'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, mime, qmsg, isCreator, isPrem, Reply, uploadToCDN,
            axios, checkLimit, addLimit
        } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isImage = /image/i.test(mime) || m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');
        if (!isImage) {
            return Reply(`\`⌜ Image to Prompt ⌟\`\n> ◦ *Format :* reply foto dengan ${command}`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const allowedModels = ['general', 'midjourney', 'flux', 'stablediffusion'];
        let chosenModel = 'general';
        if (text && text.trim().length > 0) {
            const argModel = text.trim().toLowerCase();
            if (allowedModels.includes(argModel)) {
                chosenModel = argModel;
            }
        }

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

            const res = await axios.get(`${baseUrl}/ai/toprompt?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}&model=${chosenModel}`, {
                timeout: 45000
            });

            const data = res.data?.result;
            if (!data || !data.prompt) {
                throw new Error(res.data?.error || "Gagal membuat prompt dari gambar.");
            }

            const outputTxt = `\`⌜ AI Image To Prompt ⌟\`
> ◦ *Model AI :* ${data.model.toUpperCase()}
> ◦ *Bahasa :* ${data.language.toUpperCase()}

*Prompt :*
${data.prompt}`;

            await Reply(outputTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Toprompt Error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengonversi gambar menjadi prompt: ${err.response?.data?.error || err.message}`);
        }
        return true;
    }
};
