module.exports = {
    name: 'tiktok',
    category: 'downloader',
    commands: [
        'tiktok', 'tt', 'ttdl', 'tiktokdl', 'tiktokmp3', 'ttmp3', 'tiktokaudio'
    ],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, Reply, example, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const urlMatch = (text || '').match(/(https?:\/\/[^\s]+)/i);
        const targetUrl = urlMatch ? urlMatch[0] : (text || '').trim();
        if (!targetUrl || !targetUrl.includes('tiktok.com')) {
            return Reply(example("https://vt.tiktok.com/xxxx/"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let result = null;
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            try {
                const apiUrl = `${baseUrl}/download/tiktok?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
                const response = await axios.get(apiUrl, { timeout: 20000 });
                if (response.data?.status && response.data?.result) {
                    result = response.data.result;
                }
            } catch (e) {
                console.error('Dinz API error, mencoba fallback TikWM:', e?.message);
            }

            if (!result || !result.data) {
                try {
                    const tikwmRes = await axios.post("https://www.tikwm.com/api/", {}, {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                        },
                        params: { url: targetUrl, count: 12, cursor: 0, web: 1, hd: 1 },
                        timeout: 20000
                    });
                    const d = tikwmRes.data?.data;
                    if (d) {
                        let dataItems = [];
                        if (d.duration == 0 && Array.isArray(d.images)) {
                            dataItems = d.images.map(img => ({ type: "photo", url: img }));
                        } else {
                            if (d.hdplay) dataItems.push({ type: "nowatermark_hd", url: "https://www.tikwm.com" + d.hdplay });
                            if (d.play) dataItems.push({ type: "nowatermark", url: "https://www.tikwm.com" + d.play });
                            if (d.wmplay) dataItems.push({ type: "watermark", url: "https://www.tikwm.com" + d.wmplay });
                        }
                        result = {
                            title: d.title,
                            durations: d.duration,
                            duration: `${d.duration} Seconds`,
                            cover: d.cover ? "https://www.tikwm.com" + d.cover : null,
                            data: dataItems,
                            music_info: {
                                id: d.music_info?.id,
                                title: d.music_info?.title || d.music || 'TikTok Audio',
                                author: d.music_info?.author,
                                url: d.music_info?.play ? "https://www.tikwm.com" + d.music_info.play : (d.music ? "https://www.tikwm.com" + d.music : null)
                            },
                            stats: {
                                views: d.play_count,
                                likes: d.digg_count,
                                comment: d.comment_count,
                                share: d.share_count
                            },
                            author: {
                                id: d.author?.id,
                                nickname: d.author?.nickname,
                                fullname: d.author?.unique_id,
                                avatar: d.author?.avatar ? "https://www.tikwm.com" + d.author?.avatar : null
                            }
                        };
                    }
                } catch (e2) {
                    console.error('TikWM fallback error:', e2?.message);
                }
            }

            if (!result || !result.data || result.data.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply("❌ Konten TikTok tidak ditemukan. Pastikan tautan masih aktif, video bukan privat, dan link benar.");
            }

            const isAudioOnly = command === 'tiktokmp3' || command === 'ttmp3' || command === 'tiktokaudio';

            const getAudioBuffer = async () => {
                let directUrl = result.music_info?.play || (result.music_info?.url && !result.music_info.url.includes('tikwm.com/video/music') ? result.music_info.url : null);

                if (directUrl) {
                    try {
                        const aRes = await axios.get(directUrl, {
                            responseType: 'arraybuffer',
                            timeout: 15000,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                        });
                        if (aRes.data && aRes.data.length > 5000) return Buffer.from(aRes.data);
                    } catch (e) {}
                }

                try {
                    const tikwmRes = await axios.post("https://www.tikwm.com/api/", {}, {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                        },
                        params: { url: targetUrl, count: 12, cursor: 0, web: 1, hd: 1 },
                        timeout: 15000
                    });
                    const musicStreamUrl = tikwmRes.data?.data?.music_info?.play || (tikwmRes.data?.data?.music?.startsWith("http") ? tikwmRes.data.data.music : null);
                    if (musicStreamUrl) {
                        const aRes = await axios.get(musicStreamUrl, {
                            responseType: 'arraybuffer',
                            timeout: 15000,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                        });
                        if (aRes.data && aRes.data.length > 5000) return Buffer.from(aRes.data);
                    }
                } catch (e2) {}

                return null;
            };

            if (isAudioOnly) {
                const audioBuf = await getAudioBuffer();
                if (audioBuf) {
                    await Dinz.sendMessage(m.chat, {
                        audio: audioBuf,
                        mimetype: 'audio/mpeg',
                        ptt: false,
                        fileName: `${result.music_info?.title || 'tiktok_audio'}.mp3`
                    }, { quoted: m });
                    addLimit(m.sender, isCreator);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    return;
                } else {
                    await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                    return Reply("❌ Audio tidak ditemukan untuk konten ini.");
                }
            }

            const captionText = `\`⌜ TikTok Downloader ⌟\`
> ◦ *Judul :* ${result.title || '-'}
> ◦ *Author :* ${result.author?.nickname || result.author?.fullname || '-'}
> ◦ *Likes :* ${result.stats?.likes || '0'}
> ◦ *Komentar :* ${result.stats?.comment || '0'}
> ◦ *Share :* ${result.stats?.share || '0'}
> ◦ *Views :* ${result.stats?.views || '0'}
> ◦ *Audio :* ${result.music_info?.title || '-'}`;

            const isPhotoSlide = result.durations === 0 || result.duration === "0 Seconds" || result.data?.some(e => e.type === 'photo');

            if (isPhotoSlide) {
                const photos = (result.data || []).filter(e => e.type === 'photo' || e.url);
                if (photos.length > 1) {
                    const albumItems = photos.map((p, idx) => ({
                        image: { url: p.url },
                        ...(idx === 0 ? { caption: captionText } : {})
                    }));
                    await Dinz.sendMessage(m.chat, {
                        albumMessage: albumItems
                    }, { quoted: m });
                } else if (photos.length === 1) {
                    await Dinz.sendMessage(m.chat, {
                        image: { url: photos[0].url },
                        caption: captionText
                    }, { quoted: m });
                } else {
                    await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                    return Reply("❌ Tidak ada media foto yang dapat diunduh.");
                }
            } else {
                const videoObj = (result.data || []).find(e => e.type === "nowatermark_hd") ||
                                 (result.data || []).find(e => e.type === "nowatermark") ||
                                 (result.data || []).find(e => e.type === "watermark") ||
                                 result.data?.[0];
                if (videoObj && videoObj.url) {
                    await Dinz.sendMessage(m.chat, {
                        video: { url: videoObj.url },
                        caption: captionText
                    }, { quoted: m });
                } else {
                    await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                    return Reply("❌ Gagal menemukan URL video TikTok.");
                }
            }

            try {
                const audioBuf = await getAudioBuffer();
                if (audioBuf) {
                    await Dinz.sendMessage(m.chat, {
                        audio: audioBuf,
                        mimetype: 'audio/mpeg',
                        ptt: false,
                        fileName: `${result.music_info?.title || 'tiktok_audio'}.mp3`
                    }, { quoted: m });
                }
            } catch (audioErr) {
                console.error("Gagal kirim audio tiktok:", audioErr?.message);
            }

            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('tiktok dl error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mengunduh TikTok: ${err?.response?.data?.error || err.message}`);
        }
        return true;
    }
};
