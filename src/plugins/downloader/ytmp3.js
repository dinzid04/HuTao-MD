const youtubeGist = require('../../services/youtube');
const ytdlp = require('../../services/ytdlp');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

module.exports = {
    name: 'ytmp3',
    category: 'downloader',
    commands: ['ytmp3', 'ytaudio'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!targetUrl || targetUrl.trim().length === 0) {
            return Reply(example("https://www.youtube.com/watch?v=kXYiU_JCYtU"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            let result = null;
            try {
                result = await youtubeGist.downloadYtMp3(targetUrl.trim(), false);
            } catch (eGist) {
                console.error('ytmp3 gist error, fallback API:', eGist?.message || eGist);
            }

            if (result && (result.buffer || result.filePath || result.downloadUrl)) {
                try {
                    const captionInfo = formatCard({
                        icon: '🎧',
                        title: 'YOUTUBE MP3',
                        rows: [
                            { label: 'Judul', value: toBoldSans(result.title || 'YouTube Audio') },
                            { label: 'Artis', value: result.artist || '-' },
                            { label: 'Durasi', value: toMono(result.duration || '-') },
                            { label: 'Ukuran', value: toMono(result.formattedSize || '-') }
                        ],
                        footer: `Engine: ${result.source || 'yt-dlp'}`
                    });

                    if (result.thumbnailBuffer) {
                        await Dinz.sendMessage(m.chat, { image: result.thumbnailBuffer, caption: captionInfo }, { quoted: m }).catch(() => {});
                    } else {
                        await Reply(captionInfo);
                    }

                    if (result.filePath && !result.buffer) {
                        await Dinz.sendMessage(m.chat, {
                            document: { url: result.filePath },
                            mimetype: 'audio/mpeg',
                            fileName: result.filename || `${result.title || 'youtube'}.mp3`
                        }, { quoted: m });
                    } else {
                        let audioPayload = result.buffer;
                        if (!audioPayload && result.downloadUrl) {
                            try {
                                const aRes = await axios.get(result.downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                                audioPayload = Buffer.from(aRes.data);
                            } catch (_) {
                                audioPayload = { url: result.downloadUrl };
                            }
                        }

                        await Dinz.sendMessage(m.chat, {
                            audio: audioPayload,
                            mimetype: result.mimeType || 'audio/mpeg',
                            ptt: false,
                            fileName: result.filename || `${result.title || 'youtube'}.mp3`
                        }, { quoted: m });
                    }

                    addLimit(m.sender, isCreator);
                    return await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                } finally {
                    if (result.filePath) ytdlp.cleanupFile(result.filePath);
                }
            }

            const res = await axios.get(`${baseUrl}/download/ytmp3?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, {
                timeout: 120000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = res.data?.result || res.data?.data;
            if (!data || (!data.audio && !data.download)) {
                throw new Error(res.data?.error || "Gagal mengunduh audio YouTube.");
            }

            const captionInfo = `\`⌜ YouTube MP3 Downloader ⌟\`
> ◦ *Judul :* ${data.title || 'YouTube Audio'}
> ◦ *Durasi :* ${data.duration || '-'}`;

            if (data.thumbnail) {
                try {
                    await Dinz.sendMessage(m.chat, { image: { url: data.thumbnail }, caption: captionInfo }, { quoted: m });
                } catch (e) {}
            }

            const audioUrl = data.audio || data.download;
            try {
                const aRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
                await Dinz.sendMessage(m.chat, {
                    audio: Buffer.from(aRes.data),
                    mimetype: 'audio/mpeg',
                    fileName: `${data.title || 'youtube'}.mp3`
                }, { quoted: m });
            } catch (eDl) {
                await Dinz.sendMessage(m.chat, {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${data.title || 'youtube'}.mp3`
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('ytmp3 error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengunduh YouTube MP3: ${err?.message || err}`);
        }
        return true;
    }
};
