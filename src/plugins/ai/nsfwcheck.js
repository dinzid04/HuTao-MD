module.exports = {
    name: 'nsfwcheck',
    category: 'ai',
    commands: ['nsfwcheck'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, uploadToCDN, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        if (!/image/.test(mime)) {
            return Reply(`\`⌜ AI NSFW Checker ⌟\`\n> ◦ Kirim/reply gambar dengan ketik *${command}*`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔞', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const imgBuf = await q.download();
            if (!imgBuf) throw new Error("Gagal mengunduh gambar.");

            const cdnUrl = await uploadToCDN(imgBuf, mime || 'image/jpeg');
            if (!cdnUrl) throw new Error("Gagal upload gambar ke CDN.");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const res = await axios.get(`${baseUrl}/ai/nsfw-check?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}`, { timeout: 35000 });
            const data = res.data?.result || res.data;

            const resultTxt = `\`⌜ AI NSFW Detection ⌟\`
> ◦ *Status :* ${data.is_nsfw ? '⚠️ Terdeteksi NSFW' : '✅ Aman (SFW)'}
> ◦ *Skor NSFW :* ${data.nsfw_score ? `${(data.nsfw_score * 100).toFixed(1)}%` : '-'}
> ◦ *Label :* ${data.label || 'Clean'}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ NSFW Check Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
