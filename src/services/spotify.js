const axios = require('axios');

async function downloadSpotify(url) {
    if (!url || typeof url !== 'string') {
        throw new Error("URL Spotify tidak valid.");
    }

    const match = url.match(/https?:\/\/(?:open\.)?spotify\.com\/track\/[a-zA-Z0-9]+[^\s]*/i) || url.match(/https?:\/\/spotify\.link\/[a-zA-Z0-9]+/i);
    const targetUrl = match ? match[0] : url.trim();

    const apiKey = global.ApikeyDinz;
    const baseUrl = global.apiDinz;

    try {
        const res = await axios.get(`${baseUrl}/download/spotify?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}`, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        const result = res.data?.result || res.data?.data;
        if (result && result.download) {
            const audioRes = await axios.get(result.download, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            return {
                title: result.title || 'Spotify Track',
                artist: result.artist || 'Unknown Artist',
                duration: result.duration || '-',
                image: result.image || null,
                download: result.download,
                buffer: Buffer.from(audioRes.data)
            };
        }
    } catch (e) {}

    try {
        const searchTrack = targetUrl.split('track/')[1]?.split('?')[0] || targetUrl;
        const initRes = await axios.get(`https://anabot.my.id/api/download/spotify?url=${encodeURIComponent(targetUrl)}&apikey=freeApikey`, {
            timeout: 25000
        });

        const taskId = initRes.data?.data?.taskId;
        if (taskId) {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await axios.get(`https://anabot.my.id/api/download/status?id=${taskId}&apikey=freeApikey`, { timeout: 15000 });
                if (statusRes.data?.status === 'completed' && statusRes.data?.data?.urls) {
                    const cData = statusRes.data.data;
                    const audioRes = await axios.get(cData.urls, { responseType: 'arraybuffer', timeout: 60000 });
                    return {
                        title: cData.metadata?.title || 'Spotify Music',
                        artist: cData.metadata?.channel || 'Artist',
                        duration: cData.metadata?.duration ? `${Math.floor(cData.metadata.duration / 60)}:${(cData.metadata.duration % 60).toString().padStart(2, '0')}` : '-',
                        image: cData.metadata?.thumbnail || null,
                        download: cData.urls,
                        buffer: Buffer.from(audioRes.data)
                    };
                }
            }
        }
    } catch (fbErr) {}

    throw new Error("Gagal mengunduh musik Spotify. Pastikan link track lagu publik dan valid.");
}

module.exports = {
    downloadSpotify
};
