const youtubeGist = require('../../services/youtube');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

module.exports = {
    name: 'ytmusic',
    category: 'downloader',
    commands: ['ytmusic', 'ytm', 'ytmaudio', 'ytmplay'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const query = (text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '').trim();
        if (!query) {
            return Reply(example("Linkin Park Numb atau link https://music.youtube.com/watch?v=..."));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎵', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const ytm = await youtubeGist.getYtMusicAudio(query);
            if (!ytm || (!ytm.buffer && !ytm.downloadUrl)) {
                throw new Error('Audio YouTube Music tidak ditemukan.');
            }

            const captionInfo = formatCard({
                icon: '🎵',
                title: 'YOUTUBE MUSIC',
                rows: [
                    { label: 'Judul', value: toBoldSans(ytm.title || '-') },
                    { label: 'Artis', value: ytm.artist || '-' },
                    { label: 'Album', value: ytm.album || '' },
                    { label: 'Durasi', value: toMono(ytm.duration || '-') },
                    { label: 'Ukuran', value: toMono(ytm.formattedSize || '-') },
                    { label: 'Format', value: toMono((ytm.format || 'mp3').toUpperCase()) },
                    { label: 'Link', value: ytm.videoId ? `https://music.youtube.com/watch?v=${ytm.videoId}` : (ytm.url || '-') }
                ],
                footer: `Audio dikirim via ${ytm.source || 'ytmusic'}`
            });

            if (ytm.thumbnailBuffer) {
                await Dinz.sendMessage(m.chat, {
                    image: ytm.thumbnailBuffer,
                    caption: captionInfo
                }, { quoted: m }).catch(() => Reply(captionInfo));
            } else {
                await Reply(captionInfo);
            }

            await Dinz.sendMessage(m.chat, {
                audio: ytm.buffer || { url: ytm.downloadUrl },
                mimetype: ytm.mimeType || 'audio/mpeg',
                ptt: false,
                fileName: ytm.filename || `${ytm.title || 'ytmusic'}.mp3`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('ytmusic error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil audio YouTube Music: ${err?.message || err}`);
        }
        return true;
    }
};
