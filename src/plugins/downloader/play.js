const youtubeGist = require('../../services/youtube');
const ytdlp = require('../../services/ytdlp');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

module.exports = {
    name: 'play',
    category: 'downloader',
    commands: ['play', 'playmusic', 'lagu', 'music'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("La la lost you"));
        }

        const query = text.trim();
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            try {
                const ytmRes = await youtubeGist.getYtMusicAudio(query);
                if (ytmRes && (ytmRes.buffer || ytmRes.filePath || ytmRes.downloadUrl)) {
                    try {
                        const captionInfo = formatCard({
                            icon: '🎵',
                            title: 'PLAY MUSIC',
                            rows: [
                                { label: 'Judul', value: toBoldSans(ytmRes.title || query) },
                                { label: 'Artis', value: ytmRes.artist || '-' },
                                { label: 'Durasi', value: toMono(ytmRes.duration || '-') },
                                { label: 'Ukuran', value: toMono(ytmRes.formattedSize || '-') }
                            ],
                            footer: `Engine: ${ytmRes.source || 'yt-dlp'}`
                        });

                        if (ytmRes.thumbnailBuffer) {
                            await Dinz.sendMessage(m.chat, {
                                image: ytmRes.thumbnailBuffer,
                                caption: captionInfo
                            }, { quoted: m }).catch(() => Reply(captionInfo));
                        } else {
                            await Reply(captionInfo);
                        }

                        if (ytmRes.filePath && !ytmRes.buffer) {
                            await Dinz.sendMessage(m.chat, {
                                document: { url: ytmRes.filePath },
                                mimetype: 'audio/mpeg',
                                fileName: ytmRes.filename || `${ytmRes.title || 'music'}.mp3`
                            }, { quoted: m });
                        } else {
                            await Dinz.sendMessage(m.chat, {
                                audio: ytmRes.buffer || { url: ytmRes.downloadUrl },
                                mimetype: ytmRes.mimeType || 'audio/mpeg',
                                ptt: false,
                                fileName: ytmRes.filename || `${ytmRes.title || 'music'}.mp3`
                            }, { quoted: m });
                        }

                        addLimit(m.sender, isCreator);
                        return await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    } finally {
                        if (ytmRes.filePath) ytdlp.cleanupFile(ytmRes.filePath);
                    }
                }
            } catch (eGist) {
                console.error('play yt-dlp/service fallback:', eGist?.message || eGist);
            }

            let playData = null;
            try {
                const playRes = await axios.get(`${baseUrl}/download/play?apikey=${apiKey}&query=${encodeURIComponent(query)}`, {
                    timeout: 25000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (playRes.data?.status && playRes.data?.result) {
                    playData = playRes.data.result;
                }
            } catch (ePlay) {}

            if (playData && (playData.audio || playData.download)) {
                const captionInfo = `\`⌜ Play Music ⌟\`
> ◦ *Judul :* ${playData.title || query}
> ◦ *Channel :* ${playData.author?.name || '-'}
> ◦ *Durasi :* ${playData.duration || '-'}
> ◦ *Views :* ${playData.views || '-'}
> ◦ *Diunggah :* ${playData.ago || '-'}`;

                if (playData.thumbnail) {
                    await Dinz.sendMessage(m.chat, {
                        image: { url: playData.thumbnail },
                        caption: captionInfo
                    }, { quoted: m });
                } else {
                    await Reply(captionInfo);
                }

                const audioUrl = playData.audio || playData.download;
                try {
                    const aRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
                    await Dinz.sendMessage(m.chat, {
                        audio: Buffer.from(aRes.data),
                        mimetype: 'audio/mpeg',
                        fileName: `${playData.title || 'music'}.mp3`
                    }, { quoted: m });
                } catch (errAudio) {
                    await Dinz.sendMessage(m.chat, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mpeg',
                        fileName: `${playData.title || 'music'}.mp3`
                    }, { quoted: m });
                }

                addLimit(m.sender, isCreator);
                return await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            }

            const initRes = await axios.get(`https://anabot.my.id/api/download/playmusic?query=${encodeURIComponent(query)}&apikey=freeApikey`, {
                timeout: 25000
            });

            const taskId = initRes.data?.data?.taskId;
            if (!initRes.data?.success || !taskId) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply("❌ Gagal memulai proses pencarian musik.");
            }

            let completedData = null;
            for (let i = 0; i < 20; i++) {
                await new Promise(res => setTimeout(res, 2000));
                try {
                    const statusRes = await axios.get(`https://anabot.my.id/api/download/status?id=${taskId}&apikey=freeApikey`, { timeout: 15000 });
                    if (statusRes.data?.status === 'completed' && statusRes.data?.data) {
                        completedData = statusRes.data.data;
                        break;
                    }
                } catch (pollErr) {}
            }

            if (!completedData || !completedData.urls) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Lagu "${query}" tidak ditemukan atau proses unduhan timeout.`);
            }

            const metadata = completedData.metadata || {};
            const formatDuration = (seconds) => {
                if (!seconds || isNaN(seconds)) return '-';
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            };

            const captionInfo = `\`⌜ Play Music ⌟\`
> ◦ *Judul :* ${metadata.title || query}
> ◦ *Channel :* ${metadata.channel || metadata.uploader || '-'}
> ◦ *Durasi :* ${formatDuration(metadata.duration)}
> ◦ *Views :* ${metadata.view_count ? Number(metadata.view_count).toLocaleString('id-ID') : '-'}`;

            if (metadata.thumbnail) {
                await Dinz.sendMessage(m.chat, {
                    image: { url: metadata.thumbnail },
                    caption: captionInfo
                }, { quoted: m });
            } else {
                await Reply(captionInfo);
            }

            const aRes = await axios.get(completedData.urls, { responseType: 'arraybuffer', timeout: 30000 });
            await Dinz.sendMessage(m.chat, {
                audio: Buffer.from(aRes.data),
                mimetype: 'audio/mpeg',
                fileName: `${metadata.title || 'music'}.mp3`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('play music error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat memutar musik: ${err?.message}`);
        }
        return true;
    }
};
