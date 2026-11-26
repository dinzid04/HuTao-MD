const axios = require('axios');

async function uploadToCDN(buffer, mimeType = 'image/png') {
    try {
        const { uploadUniversalTourl } = require('./uploader');
        const res = await uploadUniversalTourl(buffer, mimeType);
        if (res && res.url) return res.url;
        return null;
    } catch (e) {
        return null;
    }
}

async function upscaleImage(imageBuffer, multiplier = 2) {
    if (!Buffer.isBuffer(imageBuffer)) throw new Error("Input harus berupa Buffer gambar.");

    const baseUrl = global.apiDinz;
    const apiKey = global.ApikeyDinz;

    try {
        const cdnUrl = await uploadToCDN(imageBuffer, 'image/png');
        if (!cdnUrl) throw new Error("Gagal mengupload gambar ke CDN");

        const scale = multiplier === 4 ? '4' : '2';
        const res = await axios.get(`${baseUrl}/imagecreator/upscale?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}&scale=${scale}`, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        return Buffer.from(res.data);
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message || "Gagal melakukan AI Upscale");
    }
}

async function removeBackground(imageBuffer) {
    if (!Buffer.isBuffer(imageBuffer)) throw new Error("Input harus berupa Buffer gambar.");

    const baseUrl = global.apiDinz;
    const apiKey = global.ApikeyDinz;

    try {
        const cdnUrl = await uploadToCDN(imageBuffer, 'image/png');
        if (!cdnUrl) throw new Error("Gagal mengupload gambar ke CDN");

        const res = await axios.get(`${baseUrl}/imagecreator/removebg?apikey=${apiKey}&url=${encodeURIComponent(cdnUrl)}`, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        return Buffer.from(res.data);
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message || "Gagal melakukan Remove Background");
    }
}

module.exports = {
    upscaleImage,
    removeBackground
};
