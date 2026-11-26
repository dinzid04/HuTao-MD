const axios = require('axios');

async function downloadCapcut(url) {
    if (!url || typeof url !== 'string') {
        throw new Error("URL CapCut tidak valid.");
    }

    const match = url.match(/https?:\/\/(?:www\.)?capcut\.com\/(?:tv2|t|watch|template-detail)\/[^\s]+/i);
    const targetUrl = match ? match[0] : url.trim();

    const baseUrl = global.apiDinz;
    const apiKey = global.ApikeyDinz;

    try {
        const res = await axios.get(`${baseUrl}/download/capcut?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}`, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = res.data?.result || res.data?.data;
        if (!data || !data.videoUrl) {
            throw new Error(res.data?.error || "Gagal mendapatkan video CapCut dari server API.");
        }

        let buffer = null;
        try {
            const dlRes = await axios.get(data.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            buffer = Buffer.from(dlRes.data);
        } catch (e) {}

        return {
            title: data.title || 'CapCut Template Video',
            author: data.author || 'CapCut Creator',
            cover: data.cover || null,
            videoUrl: data.videoUrl,
            buffer: buffer
        };
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message || "Gagal mengunduh video CapCut");
    }
}

module.exports = {
    downloadCapcut
};
