module.exports = {
    name: 'playtiktok',
    category: 'downloader',
    commands: [
        'playtiktok', 'tiktokplay', 'playtt', 'ttplay', 'ptv', 'ptvtiktok', 'tiktokptv'
    ],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, Reply, example, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("jj elistis"));
        }

        const isPTVMode = command === 'ptv' || command === 'ptvtiktok' || command === 'tiktokptv';
        const query = text.trim();
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            const searchUrl = `${baseUrl}/search/tiktok?apikey=${apiKey}&q=${encodeURIComponent(query)}`;
            const searchRes = await axios.get(searchUrl, { timeout: 25000 });
            const topVideo = searchRes.data?.result?.[0];

            if (!searchRes.data?.status || !topVideo || !topVideo.url) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tidak ditemukan video TikTok untuk query "${query}".`);
            }

            let dlData = null;
            try {
                const dlUrl = `${baseUrl}/download/tiktok?apikey=${apiKey}&url=${encodeURIComponent(topVideo.url)}`;
                const dlRes = await axios.get(dlUrl, { timeout: 25000 });
                if (dlRes.data?.status && dlRes.data?.result) {
                    dlData = dlRes.data.result;
                }
            } catch (dlErr) {
                console.error('playtiktok dl API error, mencoba TikWM:', dlErr?.message);
            }

            if (!dlData || !dlData.data) {
                try {
                    const tikwmRes = await axios.post("https://www.tikwm.com/api/", {}, {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                        },
                        params: { url: topVideo.url, count: 12, cursor: 0, web: 1, hd: 1 },
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
                        dlData = {
                            title: d.title || topVideo.title,
                            durations: d.duration,
                            duration: `${d.duration} Seconds`,
                            data: dataItems,
                            stats: {
                                views: d.play_count,
                                likes: d.digg_count,
                                comment: d.comment_count,
                                share: d.share_count
                            },
                            author: {
                                nickname: d.author?.nickname,
                                fullname: d.author?.unique_id
                            }
                        };
                    }
                } catch (e2) {}
            }

            const title = dlData?.title || topVideo.title || query;
            const authorName = dlData?.author?.nickname || topVideo.author?.nickname || '-';
            const authorUser = dlData?.author?.fullname || topVideo.author?.unique_id || '-';
            const views = dlData?.stats?.views || topVideo.stats?.views || '-';
            const likes = dlData?.stats?.likes || topVideo.stats?.likes || '-';
            const comments = dlData?.stats?.comment || topVideo.stats?.comment || '-';
            const shares = dlData?.stats?.share || topVideo.stats?.share || '-';
            const duration = dlData?.durations || topVideo.duration ? `${dlData?.durations || topVideo.duration} detik` : '-';

            const captionText = `\`⌜ Play TikTok ⌟\`
> ◦ *Judul :* ${title}
> ◦ *Author :* ${authorName} (@${authorUser})
> ◦ *Durasi :* ${duration}
> ◦ *Views :* ${typeof views === 'number' ? Number(views).toLocaleString('id-ID') : views}
> ◦ *Likes :* ${typeof likes === 'number' ? Number(likes).toLocaleString('id-ID') : likes}
> ◦ *Komentar :* ${typeof comments === 'number' ? Number(comments).toLocaleString('id-ID') : comments}
> ◦ *Share :* ${typeof shares === 'number' ? Number(shares).toLocaleString('id-ID') : shares}`;

            const isPhotoSlide = dlData?.durations === 0 || dlData?.duration === "0 Seconds" || dlData?.data?.some(e => e.type === 'photo');

            if (isPhotoSlide && dlData?.data) {
                const photos = dlData.data.filter(e => e.type === 'photo' || e.url);
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
                }
            } else {
                const videoObj = dlData?.data?.find(e => e.type === "nowatermark_hd") ||
                                 dlData?.data?.find(e => e.type === "nowatermark") ||
                                 dlData?.data?.find(e => e.type === "watermark") ||
                                 dlData?.data?.[0];
                const videoUrl = videoObj?.url || topVideo.play;

                if (videoUrl) {

                    let videoBuf = null;
                    try {
                        const vRes = await axios.get(videoUrl, {
                            responseType: 'arraybuffer',
                            timeout: 30000,
                            headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                            'Referer': 'https://vidssave.com/'
                        }
                        });
                        if (vRes.data && vRes.data.length > 10000) {
                            videoBuf = Buffer.from(vRes.data);
                        }
                    } catch (vErr) {}

                    if (isPTVMode) {
                        await Dinz.sendMessage(m.chat, {
                            video: videoBuf ? videoBuf : { url: videoUrl },
                            ptv: true,
                            mimetype: 'video/mp4'
                        }, { quoted: m });
                    } else {
                        await Dinz.sendMessage(m.chat, {
                            video: videoBuf ? videoBuf : { url: videoUrl },
                            caption: captionText
                        }, { quoted: m });
                    }
                } else {
                    await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                    return Reply("❌ Gagal mengunduh video TikTok.");
                }
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('playtiktok error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat memutar TikTok: ${err?.message}`);
        }
        return true;
    }
};
