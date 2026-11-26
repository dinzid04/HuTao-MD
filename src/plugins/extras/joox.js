const { formatDurationSec, formatCard, loadScraper, fetchImageBufferSafe } = require('./_helper');

module.exports = {
    name: 'joox',
    category: 'extras',
    commands: ['joox', 'jooxplay'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, Reply, example, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        if (!text) return Reply(example('Komang Raim Laode'));
        await Dinz.sendMessage(m.chat, { react: { text: '🎵', key: m.key } }).catch(() => {});
        try {
            const joox = await loadScraper('joox.mjs');
            const results = await joox.search(text.trim());
            const list = Array.isArray(results) ? results : (results?.results || []);
            if (!list.length) return Reply(`❌ Lagu *${text.trim()}* tidak ditemukan di JOOX.`);

            const track = list[0];
            const artistNames = Array.isArray(track.artists)
                ? track.artists.map((a) => a.name).filter(Boolean).join(', ')
                : (track.artist || '-');
            const coverUrl = track.images?.[0]?.url || '';
            const streamUrl = await joox.getStreamUrl(track.id);

            const caption = formatCard({
                icon: '🎧',
                title: 'JOOX MUSIC',
                rows: [
                    { label: 'Judul', value: `*${track.name || '-'}*` },
                    { label: 'Artis', value: artistNames },
                    { label: 'Album', value: track.album?.name || '-' },
                    { label: 'Durasi', value: `\`${formatDurationSec(track.duration)}\`` }
                ],
                footer: `Sedang mengirim audio JOOX... • Ketik ${pref}jooxlirik ${track.name}`
            });

            const coverBuf = await fetchImageBufferSafe(coverUrl);
            if (coverBuf) {
                await Dinz.sendMessage(m.chat, { image: coverBuf, caption }, { quoted: m });
            } else {
                await Reply(caption);
            }

            if (streamUrl && typeof streamUrl === 'string' && streamUrl.startsWith('http')) {
                await Dinz.sendMessage(
                    m.chat,
                    {
                        audio: { url: streamUrl },
                        mimetype: 'audio/mp4',
                        fileName: `${track.name || 'joox'}.m4a`
                    },
                    { quoted: m }
                );
            } else {
                await Reply('⚠️ Link audio stream sedang tidak tersedia untuk lagu ini.');
            }
        } catch (e) {
            return Reply(`❌ JOOX Play error: ${e.message}`);
        }
        return true;
    }
};
