module.exports = {
    name: 'whatmusic',
    category: 'tools',
    commands: ['whatmusic', 'shazam'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, uploadToCDN, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        if (!/audio|video/.test(mime)) {
            return Reply(`\`⌜ WhatMusic (Shazam) ⌟\`\n> ◦ Kirim/reply cuplikan lagu (Audio/Video/VN) dengan ketik *${command}*`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🎵", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const audioBuffer = await q.download();
            if (!audioBuffer) throw new Error("Gagal mengunduh audio.");

            const cdnUrl = await uploadToCDN(audioBuffer, mime || 'audio/mp3');
            if (!cdnUrl) throw new Error("Gagal mengunggah audio ke CDN");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const res = await axios.get(`${baseUrl}/tools/whatmusik?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}`, { timeout: 45000 });
            const data = res.data?.result;
            if (!data || !data.title) throw new Error("Musik tidak berhasil diidentifikasi.");

            const resultTxt = `\`⌜ WhatMusic Identified ⌟\`
> ◦ *Judul :* ${data.title}
> ◦ *Artis :* ${data.artist || '-'}
> ◦ *Album :* ${data.album || '-'}
> ◦ *Genre :* ${data.genre || '-'}
> ◦ *Rilis :* ${data.release_date || '-'}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
