module.exports = {
    name: 'fakeml',
    category: 'maker',
    commands: ['fakeml', 'fakeffml'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, Reply, uploadToCDN, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mimeType = (q.msg || q).mimetype || '';
        const isImage = /image/.test(mimeType) || q.type === 'imageMessage';

        if (!isImage) {
            return Reply(`\`⌜ Fake MLBB ⌟\`\n> ◦ *Format :* reply foto dengan caption ${command} username|rank|border`);
        }

        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Fake MLBB ⌟\`\n> ◦ *Format :* reply foto dengan caption ${command} username|rank|border`);
        }

        let username = '';
        let rank = 'imo';
        let border = '0';

        if (text.includes('|')) {
            const parts = text.split('|').map(s => s.trim());
            username = parts[0] || m.pushName || 'Player';
            rank = parts[1] || rank;
            border = parts[2] || border;
        } else {
            username = text.trim();
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const imgBuf = await q.download();
            if (!imgBuf || imgBuf.length === 0) throw new Error("Gagal mengunduh foto yang di-reply.");

            const avatarUrl = await uploadToCDN(imgBuf, mimeType || 'image/jpeg');
            if (!avatarUrl) throw new Error("Gagal mengunggah foto ke server CDN.");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/fakeml?apikey=${apiKey}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatarUrl)}&rank=${encodeURIComponent(rank)}&border=${encodeURIComponent(border)}`;

            const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 45000 });
            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(res.data),
                caption: `\`⌜ Fake Lobby Mobile Legends ⌟\`\n> ◦ *Username :* ${username}\n> ◦ *Rank :* ${rank.toUpperCase()}\n> ◦ *Border :* ${border}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('[FAKEML ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat fake ML: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
