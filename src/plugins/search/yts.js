module.exports = {
    name: 'yts',
    category: 'search',
    commands: ['yts', 'ytsearch'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("La la lost you"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let videos = [];
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            try {
                const ytRes = await axios.get(`${baseUrl}/search/youtube?apikey=${apiKey}&q=${encodeURIComponent(text.trim())}`, { timeout: 15000 });
                if (ytRes.data?.status && Array.isArray(ytRes.data?.result)) {
                    videos = ytRes.data.result.filter(e => e.type === 'video' || e.url).slice(0, 5);
                }
            } catch (e) {
                console.error('Dinz YT search error, fallback ke yt-search:', e?.message);
            }

            if (videos.length === 0) {
                try {
                    const yts = require('yt-search');
                    const searchResults = await yts(text.trim());
                    videos = (searchResults.videos || []).slice(0, 5);
                } catch (e2) {
                    console.error('yt-search fallback error:', e2?.message);
                }
            }

            if (videos.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tidak ditemukan hasil pencarian YouTube untuk "${text.trim()}".`);
            }

            let teks = `\`⌜ YouTube Search ⌟\`\n> ◦ *Query :* ${text.trim()}\n> ◦ *Ditemukan :* ${videos.length} Video\n\n`;

            for (let i = 0; i < videos.length; i++) {
                const v = videos[i];
                teks += `*${i + 1}. ${v.title || 'Video'}*\n`;
                teks += `> ◦ *Channel :* ${v.author?.name || '-'}\n`;
                teks += `> ◦ *Durasi :* ${v.timestamp || v.duration?.timestamp || '-'}\n`;
                teks += `> ◦ *Views :* ${v.views ? Number(v.views).toLocaleString('id-ID') : '-'}\n`;
                teks += `> ◦ *Diunggah :* ${v.ago || '-'}\n`;
                teks += `> ◦ *Link :* ${v.url}\n\n`;
            }

            teks += `💡 *Ketik play <judul> untuk memutar dan mengunduh lagunya*`;

            const topThumb = videos[0]?.thumbnail || videos[0]?.image;
            if (topThumb) {
                await Dinz.sendMessage(m.chat, {
                    image: { url: topThumb },
                    caption: teks
                }, { quoted: m });
            } else {
                await Reply(teks);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('yts error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mencari di YouTube: ${err?.message}`);
        }
        return true;
    }
};
