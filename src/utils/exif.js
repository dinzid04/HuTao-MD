require('../../settings');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { execSync } = require('child_process');
const Crypto = require('crypto');
const ff = require('fluent-ffmpeg');
const FileType = require('file-type');
const webp = require('node-webpmux');

try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    try {
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        if (ffmpegInstaller && ffmpegInstaller.path) {
            try { fs.chmodSync(ffmpegInstaller.path, 0o755); } catch {}
            ff.setFfmpegPath(ffmpegInstaller.path);
            const ffDir = path.dirname(ffmpegInstaller.path);
            if (!String(process.env.PATH || '').includes(ffDir)) {
                process.env.PATH = `${process.env.PATH || ''}:${ffDir}`;
            }
        }
    } catch {}
}

const localTmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(localTmpDir)) {
    fs.mkdirSync(localTmpDir, { recursive: true });
}

async function imageToWebp(media) {
    const tmpFileOut = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`)
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    try { fs.unlinkSync(tmpFileOut) } catch (e) {}
    try { fs.unlinkSync(tmpFileIn) } catch (e) {}
    return buff
}

async function videoToWebp(media) {
    const tmpFileOut = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`)
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
                "-loop",
                "0",
                "-ss",
                "00:00:00",
                "-t",
                "00:00:05",
                "-preset",
                "default",
                "-an",
                "-vsync",
                "0"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    try { fs.unlinkSync(tmpFileOut) } catch (e) {}
    try { fs.unlinkSync(tmpFileIn) } catch (e) {}
    return buff
}

function createStickerExifBuffer(data = {}) {
    const wr = {
        a: data.packId || global.author || '',
        b: data.packname ? data.packname : (global.packname ? global.packname : ''),
        c: data.author ? data.author : (global.author ? global.author : ''),
        d: data.categories ? data.categories : [''],
        e: data.isAvatar ? data.isAvatar : 0
    };
    const json = {
        'sticker-pack-id': wr.a,
        'sticker-pack-name': wr.b,
        'sticker-pack-publisher': wr.c,
        'emojis': wr.d,
        'is-avatar-sticker': wr.e
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    return exif;
}

function makeRiffChunk(fourCC, payload) {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const header = Buffer.alloc(8);
    header.write(fourCC, 0, 4, 'ascii');
    header.writeUInt32LE(body.length, 4);
    if (body.length % 2 === 1) {
        return Buffer.concat([header, body, Buffer.from([0])]);
    }
    return Buffer.concat([header, body]);
}

function parseWebpChunks(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 16) return null;
    if (buf.subarray(0, 4).toString('ascii') !== 'RIFF' || buf.subarray(8, 12).toString('ascii') !== 'WEBP') {
        return null;
    }
    const chunks = [];
    let pos = 12;
    while (pos + 8 <= buf.length) {
        const tag = buf.subarray(pos, pos + 4).toString('ascii');
        const len = buf.readUInt32LE(pos + 4);
        const dataStart = pos + 8;
        const dataEnd = Math.min(buf.length, dataStart + len);
        chunks.push({ tag, data: Buffer.from(buf.subarray(dataStart, dataEnd)) });
        pos = dataStart + len + (len % 2);
    }
    return chunks;
}

function readSimpleWebpDimensions(chunks) {
    const vp8x = chunks.find((c) => c.tag === 'VP8X');
    if (vp8x && vp8x.data.length >= 10) {
        const w = 1 + (vp8x.data[4] | (vp8x.data[5] << 8) | (vp8x.data[6] << 16));
        const h = 1 + (vp8x.data[7] | (vp8x.data[8] << 8) | (vp8x.data[9] << 16));
        return { width: w, height: h, hasAlpha: Boolean(vp8x.data[0] & 0x10) };
    }
    const vp8l = chunks.find((c) => c.tag === 'VP8L');
    if (vp8l && vp8l.data.length >= 5 && vp8l.data[0] === 0x2f) {
        const bits = vp8l.data.readUInt32LE(1);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        const hasAlpha = Boolean((bits >> 28) & 1);
        return { width, height, hasAlpha };
    }
    const vp8 = chunks.find((c) => c.tag === 'VP8 ');
    if (vp8 && vp8.data.length >= 10 && vp8.data[3] === 0x9d && vp8.data[4] === 0x01 && vp8.data[5] === 0x2a) {
        const width = vp8.data.readUInt16LE(6) & 0x3fff;
        const height = vp8.data.readUInt16LE(8) & 0x3fff;
        return { width, height, hasAlpha: false };
    }
    return null;
}

/**
 * Menyisipkan chunk EXIF WhatsApp secara lossless langsung ke kontainer RIFF WebP.
 * Tidak menyentuh frame ANIM/ANMF sedikit pun sehingga stiker animasi/GIF 100% tetap bergerak!
 */
function injectWebpExifBuffer(webpBuf, exifBuf) {
    const chunks = parseWebpChunks(webpBuf);
    if (!chunks || chunks.length === 0) return null;

    const kept = chunks.filter((c) => c.tag !== 'EXIF');
    let vp8x = kept.find((c) => c.tag === 'VP8X');
    const hasAnim = kept.some((c) => c.tag === 'ANIM' || c.tag === 'ANMF');
    const hasIccp = kept.some((c) => c.tag === 'ICCP');
    const hasXmp = kept.some((c) => c.tag === 'XMP ');
    const hasAlphChunk = kept.some((c) => c.tag === 'ALPH');

    if (vp8x && vp8x.data.length >= 10) {
        const copy = Buffer.from(vp8x.data);
        copy[0] |= 0x08; // EXIF flag
        if (hasAnim) copy[0] |= 0x02; // ANIM flag
        vp8x.data = copy;
    } else {
        const dims = readSimpleWebpDimensions(kept);
        if (!dims || !dims.width || !dims.height) return null;
        const vp8xData = Buffer.alloc(10, 0);
        let flags = 0x08; // EXIF
        if (hasAnim) flags |= 0x02;
        if (hasXmp) flags |= 0x04;
        if (dims.hasAlpha || hasAlphChunk) flags |= 0x10;
        if (hasIccp) flags |= 0x20;
        vp8xData[0] = flags;
        const w = dims.width - 1;
        const h = dims.height - 1;
        vp8xData[4] = w & 0xff;
        vp8xData[5] = (w >> 8) & 0xff;
        vp8xData[6] = (w >> 16) & 0xff;
        vp8xData[7] = h & 0xff;
        vp8xData[8] = (h >> 8) & 0xff;
        vp8xData[9] = (h >> 16) & 0xff;
        kept.unshift({ tag: 'VP8X', data: vp8xData });
    }

    const ordered = [];
    const vp8xEntry = kept.find((c) => c.tag === 'VP8X');
    if (vp8xEntry) ordered.push(vp8xEntry);
    for (const c of kept) {
        if (c.tag === 'VP8X' || c.tag === 'XMP ') continue;
        ordered.push(c);
    }
    ordered.push({ tag: 'EXIF', data: exifBuf });
    for (const c of kept) {
        if (c.tag === 'XMP ') ordered.push(c);
    }

    const bodyParts = [Buffer.from('WEBP', 'ascii'), ...ordered.map((c) => makeRiffChunk(c.tag, c.data))];
    const body = Buffer.concat(bodyParts);
    const riff = Buffer.alloc(8);
    riff.write('RIFF', 0, 4, 'ascii');
    riff.writeUInt32LE(body.length, 4);
    return Buffer.concat([riff, body]);
}

async function writeExif(media, data) {
    const rawBuffer = Buffer.isBuffer(media) ? media : (media && Buffer.isBuffer(media.data) ? media.data : Buffer.from(media || ''));
    const anu = (media && media.mimetype) ? { mime: media.mimetype } : await FileType.fromBuffer(rawBuffer);
    const mimeStr = String(anu?.mime || '');
    const wMedia = /webp/.test(mimeStr)
        ? rawBuffer
        : /gif|video/.test(mimeStr)
            ? await videoToWebp(rawBuffer)
            : /jpeg|jpg|png/.test(mimeStr)
                ? await imageToWebp(rawBuffer)
                : rawBuffer;

    if (data) {
        const exif = createStickerExifBuffer(data);
        const tmpFileOut = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);

        // Gunakan lossless RIFF EXIF injector terlebih dahulu agar frame animasi (ANIM/ANMF) 100% utuh
        const injected = injectWebpExifBuffer(wMedia, exif);
        if (Buffer.isBuffer(injected) && injected.length > 20) {
            fs.writeFileSync(tmpFileOut, injected);
            return tmpFileOut;
        }

        const tmpFileIn = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        fs.writeFileSync(tmpFileIn, wMedia);
        const img = new webp.Image();
        await img.load(tmpFileIn);
        try { fs.unlinkSync(tmpFileIn); } catch (e) {}
        img.exif = exif;
        await img.save(tmpFileOut);
        return tmpFileOut;
    }
}

module.exports = {
    imageToWebp,
    videoToWebp,
    writeExif,
    createStickerExifBuffer,
    injectWebpExifBuffer,
    parseWebpChunks,
    readSimpleWebpDimensions
};
