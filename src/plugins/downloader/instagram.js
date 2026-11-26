module.exports = {
    name: 'instagram',
    category: 'downloader',
    commands: ['ig', 'instagram', 'igdl', 'instagramdl'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const urlMatch = (text || '').match(/(https?:\/\/[^\s]+)/i);
        const targetUrl = urlMatch ? urlMatch[0] : (text || '').trim();
        if (!targetUrl || !targetUrl.includes('instagram.com')) {
            return Reply(example("https://www.instagram.com/reel/xxxx/"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let result = null;
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            try {
                const apiUrl = `${baseUrl}/download/instagram?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
                const response = await axios.get(apiUrl, { timeout: 30000 });
                const json = response.data;
                if (json?.status && json?.result?.data && json.result.data.length > 0) {
                    result = json.result;
                }
            } catch (e) {

            }

            if (!result || !result.data || result.data.length === 0) {
                try {
                    const fallbackRes = await axios.get(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(targetUrl)}`, { timeout: 25000 });
                    if (fallbackRes.data?.status && fallbackRes.data?.data) {
                        const fbData = fallbackRes.data.data;
                        const items = Array.isArray(fbData) ? fbData : [fbData];
                        if (items.length > 0) {
                            result = {
                                profile: { username: '-' },
                                caption: { text: '-' },
                                statistics: { like: '-', comment: '-', share: '0' },
                                data: items.map(x => ({
                                    type: (typeof x === 'object' && (x.type === 'video' || x.url?.includes('.mp4') || x.thumbnail)) ? 'video' : 'image',
                                    url: typeof x === 'string' ? x : (x.url || x.download_url || '')
                                })).filter(x => Boolean(x.url))
                            };
                        }
                    }
                } catch (_) {}
            }

            if (!result || !result.data || result.data.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply("❌ Gagal mengunduh konten Instagram. Pastikan akun tidak privat dan link valid.");
            }

            const captionText = `\`⌜ Instagram Downloader ⌟\`
> ◦ *Username :* ${result.profile?.username || '-'}
> ◦ *Caption :* ${result.caption?.text || '-'}
> ◦ *Likes :* ${result.statistics?.like || '-'}
> ◦ *Comments :* ${result.statistics?.comment || '-'}
> ◦ *Share :* ${result.statistics?.share || '0'}`;

            const mediaList = (result.data || []).filter(item => item.type !== 'audio');

            if (mediaList.length > 1) {
                const albumItems = mediaList.map((item, idx) => {
                    if (item.type === 'video') {
                        return {
                            video: { url: item.url },
                            ...(idx === 0 ? { caption: captionText } : {})
                        };
                    } else {
                        return {
                            image: { url: item.url },
                            ...(idx === 0 ? { caption: captionText } : {})
                        };
                    }
                });
                await Dinz.sendMessage(m.chat, {
                    albumMessage: albumItems
                }, { quoted: m });
            } else if (mediaList.length === 1) {
                const item = mediaList[0];
                if (item.type === 'video') {
                    await Dinz.sendMessage(m.chat, {
                        video: { url: item.url },
                        caption: captionText
                    }, { quoted: m });
                } else {
                    await Dinz.sendMessage(m.chat, {
                        image: { url: item.url },
                        caption: captionText
                    }, { quoted: m });
                }
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('instagram dl error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem';
            return Reply(`❌ Terjadi kesalahan saat mengunduh Instagram: ${errorMsg}`);
        }
        return true;
    }
};
