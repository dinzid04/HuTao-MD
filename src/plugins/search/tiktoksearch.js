module.exports = {
    name: 'tiktoksearch',
    category: 'search',
    commands: ['tiktoksearch', 'ttsearch', 'tiks'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("jj elistis"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/search/tiktok?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`;
            const response = await axios.get(apiUrl, { timeout: 25000 });
            const json = response.data;

            if (!json.status || !Array.isArray(json.result) || json.result.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tidak ditemukan hasil pencarian TikTok untuk "${text.trim()}".`);
            }

            const videos = json.result.slice(0, 5);
            let teks = `\`⌜ TikTok Search ⌟\`\n> ◦ *Query :* ${text.trim()}\n> ◦ *Ditemukan :* ${videos.length} Video\n\n`;

            for (let i = 0; i < videos.length; i++) {
                const v = videos[i];
                teks += `*${i + 1}. ${v.title || 'Video TikTok'}*\n`;
                teks += `> ◦ *Author :* ${v.author?.nickname || v.author?.unique_id || '-'} (@${v.author?.unique_id || '-'})\n`;
                teks += `> ◦ *Durasi :* ${v.duration ? v.duration + ' detik' : '-'}\n`;
                teks += `> ◦ *Views :* ${v.stats?.views ? Number(v.stats.views).toLocaleString('id-ID') : '-'}\n`;
                teks += `> ◦ *Likes :* ${v.stats?.likes ? Number(v.stats.likes).toLocaleString('id-ID') : '-'}\n`;
                teks += `> ◦ *Komentar :* ${v.stats?.comment ? Number(v.stats.comment).toLocaleString('id-ID') : '-'}\n`;
                teks += `> ◦ *Link :* ${v.url}\n\n`;
            }

            teks += `💡 *Ketik tiktok <link> untuk mengunduh video/fotonya*`;

            const imageUrl = global.image?.menu || `https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg`;
            try {
                const httpsTt = require('https');
                const axiosTt = require('axios');
                let imgBufTt = null;
                try {
                    const resTt = await axiosTt.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 20000,
                        httpsAgent: new httpsTt.Agent({ rejectUnauthorized: false }),
                        validateStatus: () => true
                    });
                    if (resTt.status === 200 && resTt.data && resTt.data.length) {
                        imgBufTt = Buffer.from(resTt.data);
                    }
                } catch (eTt) {}
                if (imgBufTt) {
                    await Dinz.sendMessage(m.chat, {
                        image: imgBufTt,
                        caption: teks
                    }, { quoted: m });
                } else {
                    await Dinz.sendMessage(m.chat, {
                        image: { url: imageUrl },
                        caption: teks
                    }, { quoted: m });
                }
            } catch (imgErr) {
                await Reply(teks);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('tiktoksearch error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mencari di TikTok: ${err?.message}`);
        }
        return true;
    }
};
