const youtubeGist = require('../../services/youtube');

module.exports = {
    name: 'ytmlirik',
    category: 'downloader',
    commands: ['ytmlirik', 'ytmlyrics'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const query = (text || m.quoted?.text || '').trim();
        if (!query) return Reply(example("Linkin Park Numb"));

        await Dinz.sendMessage(m.chat, { react: { text: '📝', key: m.key } }).catch(() => {});
        try {
            const res = await youtubeGist.getYtMusicLyrics(query);
            if (!res.lyrics) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Lirik tidak tersedia di YouTube Music untuk *${res.title || query}*.`);
            }
            const caption = `\`⌜ YouTube Music Lyrics ⌟\`\n> ◦ *Judul :* ${res.title}\n> ◦ *Artis :* ${res.artist}\n> ◦ *Sumber :* ${res.source}\n\n${res.lyrics}`;
            await Reply(caption);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('ytmlirik error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil lirik YouTube Music: ${err?.message || err}`);
        }
        return true;
    }
};
