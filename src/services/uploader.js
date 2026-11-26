const axios = require('axios');
const FormData = require('form-data');
const zlib = require('zlib');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function detectExtFromBuffer(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return '';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
    if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WAVE') return 'wav';
    if (buf.subarray(0, 4).toString('ascii') === 'OggS') return 'ogg';
    if (buf.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
    if (buf.subarray(0, 3).toString('ascii') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'mp3';
    if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return 'mp4';
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
    if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05)) return 'zip';
    return '';
}

function getMimeExt(mime = '', filename = '', buffer = null) {
    const m = String(mime || '').toLowerCase();
    if (/image\/png/.test(m)) return 'png';
    if (/image\/jpe?g/.test(m)) return 'jpg';
    if (/image\/webp/.test(m)) return 'webp';
    if (/image\/gif/.test(m)) return 'gif';
    if (/image\/svg/.test(m)) return 'svg';
    if (/video\/mp4/.test(m)) return 'mp4';
    if (/video\/webm/.test(m)) return 'webm';
    if (/video\/quicktime/.test(m)) return 'mov';
    if (/video\/x-matroska/.test(m)) return 'mkv';
    if (/audio\/(mp3|mpeg)/.test(m)) return 'mp3';
    if (/audio\/(ogg|opus)/.test(m)) return 'ogg';
    if (/audio\/(mp4|m4a|aac)/.test(m)) return 'm4a';
    if (/audio\/wav/.test(m)) return 'wav';
    if (/audio\/flac/.test(m)) return 'flac';
    if (/application\/pdf/.test(m)) return 'pdf';
    if (/application\/zip/.test(m)) return 'zip';
    if (/application\/vnd\.android\.package-archive/.test(m)) return 'apk';
    if (/application\/json/.test(m)) return 'json';
    if (/javascript/.test(m)) return 'js';
    if (/text\/html/.test(m)) return 'html';
    if (/text\/plain/.test(m)) return 'txt';

    if (filename && String(filename).includes('.')) {
        const fExt = String(filename).split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (fExt && fExt.length <= 6) return fExt;
    }

    const sniffed = detectExtFromBuffer(buffer);
    if (sniffed) return sniffed;
    return 'bin';
}

function isNullBuffer(buf) {
    if (!buf || !buf.length) return true;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 0) return false;
    }
    return true;
}

async function uploadTop4Top(buffer, mimeType, generateFilename) {
    if (!buffer) {
        console.error('Top4Top Upload Error: No buffer provided');
        return null;
    }
    const origin = 'https://top4top.io';
    const filename = typeof generateFilename === 'function'
        ? generateFilename(mimeType)
        : ('upload_' + Date.now() + '.' + getMimeExt(mimeType, '', buffer));
    const ext = filename.split('.').pop();
    const maxAttempts = 2;

    let cookie = '';
    try {
        const home = await axios.get(origin + '/', {
            headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate' },
            timeout: 12000,
            validateStatus: () => true,
            responseType: 'arraybuffer'
        });
        let hb = Buffer.from(home.data || []);
        if (hb.length > 2 && hb[0] === 0x1f && hb[1] === 0x8b) hb = zlib.gunzipSync(hb);
        const setCookie = home.headers['set-cookie'] || [];
        const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
        cookie = parts.map(c => String(c).split(';')[0]).filter(Boolean).join('; ');
        const sid = hb.toString('utf8').match(/name="sid" value="([^"]+)"/)?.[1];
        if (sid && !cookie.includes('sid=')) cookie = cookie ? cookie + '; sid=' + sid : 'sid=' + sid;
    } catch (_) {}

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const data = new FormData();
            data.append('file_1_', buffer, { filename: filename, contentType: mimeType || undefined });
            data.append('submitr', '[ رفع الملفات ]');

            const headers = Object.assign({}, data.getHeaders(), {
                'User-Agent': UA,
                'Origin': origin,
                'Referer': origin + '/index.php',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate'
            });
            if (cookie) headers['Cookie'] = cookie;

            const res = await axios.post(origin + '/index.php', data, {
                headers: headers,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 25000,
                validateStatus: () => true,
                responseType: 'arraybuffer'
            });

            let buf = Buffer.from(res.data || []);
            if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
                buf = zlib.gunzipSync(buf);
            }
            const html = buf.toString('utf8');
            const isRateLimited = isNullBuffer(buf) || html.indexOf(String.fromCharCode(0)) >= 0;

            if (isRateLimited || !/<input|all_boxes|DOCTYPE/i.test(html)) {
                if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 2500));
                continue;
            }

            const matches = html.matchAll(/<input readonly="readonly" class="all_boxes" onclick="this.select\(\);" type="text" value="(.+?)"\s*\/>/g);
            const arr = Array.from(matches);
            if (!arr.length) {
                if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 2000));
                continue;
            }

            const downloadUrl = arr.map((v) => v[1]).find((v) => v.endsWith(ext)) || arr[0][1];
            const deleteUrl = arr.map((v) => v[1]).find((v) => v.endsWith('html'));
            const qrMatch = html.match(/<div class="qr_img"><img src="(.+?)"/);
            const qrcodeUrl = origin + '/' + (qrMatch ? qrMatch[1] : '');

            if (downloadUrl && /^https?:\/\//i.test(downloadUrl)) {
                return { downloadUrl, deleteUrl, qrcodeUrl };
            }
        } catch (e) {
            if (attempt === maxAttempts) {
                console.error('Top4Top Upload Error:', e.message);
                return null;
            }
        }
    }
    return null;
}

async function uploadCatboxPermanent(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const url = String(res.data || '').trim();
    if (res.status >= 400 || !/^https?:\/\/files\.catbox\.moe\//i.test(url)) {
        throw new Error('Catbox error (' + res.status + '): ' + url.slice(0, 120));
    }
    return url;
}

async function uploadLitterbox(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('time', '72h');
    form.append('fileToUpload', buffer, { filename });

    const res = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const url = String(res.data || '').trim();
    if (res.status >= 400 || !/^https?:\/\//i.test(url)) {
        throw new Error('Litterbox error (' + res.status + '): ' + url.slice(0, 120));
    }
    return url;
}

async function uploadCatbox(buffer, ext = 'png') {
    try {
        return await uploadCatboxPermanent(buffer, ext);
    } catch (_) {
        return await uploadLitterbox(buffer, ext);
    }
}

async function uploadQuax(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('files[]', buffer, { filename });

    const res = await axios.post('https://qu.ax/upload.php', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const url = res.data && res.data.files && res.data.files[0] && res.data.files[0].url;
    if (res.status >= 400 || !url || !/^https?:\/\//i.test(String(url))) {
        throw new Error('Gagal upload ke Qu.ax (' + res.status + ')');
    }
    return String(url).trim();
}

async function uploadUguu(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const endpoints = ['https://uguu.se/upload', 'https://uguu.se/upload.php'];
    let lastErr = null;

    for (const ep of endpoints) {
        try {
            const form = new FormData();
            form.append('files[]', buffer, { filename });
            const res = await axios.post(ep, form, {
                headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 25000,
                validateStatus: () => true
            });
            const url = res.data && res.data.files && res.data.files[0] && res.data.files[0].url;
            if (res.status < 400 && url && /^https?:\/\//i.test(String(url))) {
                return String(url).trim();
            }
            lastErr = new Error('HTTP ' + res.status);
        } catch (e) {
            lastErr = e;
        }
    }
    throw new Error('Gagal upload ke Uguu: ' + (lastErr?.message || 'unknown'));
}

async function uploadPomf(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('files[]', buffer, { filename });

    const res = await axios.post('https://pomf.lain.la/upload.php', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const url = res.data && res.data.files && res.data.files[0] && res.data.files[0].url;
    if (res.status >= 400 || !url || !/^https?:\/\//i.test(String(url))) {
        throw new Error('Gagal upload ke Pomf (' + res.status + ')');
    }
    return String(url).trim();
}

async function uploadTmpfiles(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'dat');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('file', buffer, { filename });

    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const rawUrl = res.data && res.data.data && res.data.data.url;
    if (res.status >= 400 || !rawUrl || !/^https?:\/\//i.test(String(rawUrl))) {
        throw new Error('Gagal upload ke Tmpfiles (' + res.status + ')');
    }
    return String(rawUrl).trim().replace(/^https?:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/dl/');
}

async function uploadPixhost(buffer, ext = 'png') {
    const safeExt = ext && ext !== 'bin' ? ext : (detectExtFromBuffer(buffer) || 'jpg');
    const filename = 'upload_' + Date.now() + '.' + safeExt;
    const form = new FormData();
    form.append('img', buffer, { filename });
    form.append('content_type', '0');
    form.append('max_th_size', '420');

    const res = await axios.post('https://api.pixhost.to/images', form, {
        headers: Object.assign({}, form.getHeaders(), { 'User-Agent': UA }),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 25000,
        validateStatus: () => true
    });

    const url = res.data && (res.data.show_url || res.data.th_url);
    if (res.status >= 400 || !url) throw new Error('Gagal upload ke Pixhost (' + res.status + ')');
    return String(url).trim();
}

async function uploadUniversalTourl(buffer, mime = '', filename = '') {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Buffer media kosong atau tidak valid.');
    }
    const ext = getMimeExt(mime, filename, buffer);
    const isImage = /^(jpg|jpeg|png|webp|gif)$/i.test(ext);
    const generateFilename = (m) => 'upload_' + Date.now() + '.' + getMimeExt(m, filename, buffer);

    const providers = [
        { name: 'Catbox.moe', fn: () => uploadCatboxPermanent(buffer, ext) },
        { name: 'Uguu.se', fn: () => uploadUguu(buffer, ext) },
        { name: 'Qu.ax', fn: () => uploadQuax(buffer, ext) },
        { name: 'Pomf.lain.la', fn: () => uploadPomf(buffer, ext) },
        { name: 'Litterbox (72h)', fn: () => uploadLitterbox(buffer, ext) },
        { name: 'Tmpfiles', fn: () => uploadTmpfiles(buffer, ext) }
    ];
    if (isImage) {
        providers.push({ name: 'Pixhost', fn: () => uploadPixhost(buffer, ext) });
    }
    providers.push({
        name: 'Top4Top',
        fn: async () => {
            const res = await uploadTop4Top(buffer, mime, generateFilename);
            return res && res.downloadUrl;
        }
    });

    const errors = [];
    for (const provider of providers) {
        try {
            const url = await provider.fn();
            if (url && /^https?:\/\//i.test(String(url))) {
                return { url: String(url).trim(), provider: provider.name, ext };
            }
        } catch (e) {
            errors.push(`${provider.name}: ${e.message}`);
            console.log('UniversalTourl ' + provider.name + ' failed: ' + e.message);
        }
    }

    throw new Error('Semua server uploader gagal (' + errors.slice(0, 3).join(' | ') + ')');
}

module.exports = {
    getMimeExt,
    detectExtFromBuffer,
    uploadTop4Top,
    uploadCatbox,
    uploadCatboxPermanent,
    uploadLitterbox,
    uploadQuax,
    uploadUguu,
    uploadPomf,
    uploadTmpfiles,
    uploadPixhost,
    uploadUniversalTourl
};
