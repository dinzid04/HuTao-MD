const youtubeGist = require('../../services/youtube');

module.exports = {
    name: 'ytmsearch',
    category: 'downloader',
    commands: ['ytmsearch', 'ytms'],

    async execute(ctx) {
        const {
            Dinz, m, text, isCreator, Reply, example, sendSelectList, prefixMgr, usedPrefix,
            checkLimit, addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const query = (text || '').trim();
        if (!query) return Reply(example("Tulus Hati Hati di Jalan"));

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        try {
            const tracks = await youtubeGist.searchYtMusic(query, 'songs', 8);
            if (!tracks.length) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Lagu "${query}" tidak ditemukan di YouTube Music.`);
            }

            const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;
            const lines = tracks.map(t =>
                `*${t.index}. ${t.title}*\n> ◦ Artis : ${t.artist}\n> ◦ Durasi : ${t.duration}\n> ◦ ID : \`${t.videoId || '-'}\``
            ).join('\n\n');
            const caption = `\`⌜ YouTube Music Search ⌟\`\n> ◦ *Query :* ${query}\n> ◦ *Hasil :* ${tracks.length} lagu\n\n${lines}\n\n🎵 Pilih lagu lewat tombol di bawah atau ketik *${pfx}ytmusic <ID>*`;

            const selectable = tracks.filter(t => t.videoId);
            if (selectable.length && typeof sendSelectList === 'function') {
                await sendSelectList({
                    title: 'Hasil YouTube Music',
                    buttonTitle: '🎵 Pilih & Unduh Audio',
                    captionText: caption,
                    headerImage: selectable[0].thumbnail || undefined,
                    rows: selectable.map(t => ({
                        title: `${t.index}. ${t.title}`.slice(0, 60),
                        description: `${t.artist} (${t.duration})`,
                        id: `${pfx}ytmusic ${t.videoId}`
                    }))
                });
            } else {
                await Reply(caption);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('ytmsearch error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mencari di YouTube Music: ${err?.message || err}`);
        }
        return true;
    }
};
