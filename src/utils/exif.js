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

async function writeExif(media, data) {
    const rawBuffer = Buffer.isBuffer(media) ? media : (media && Buffer.isBuffer(media.data) ? media.data : Buffer.from(media || ''));
    const anu = (media && media.mimetype) ? { mime: media.mimetype } : await FileType.fromBuffer(rawBuffer);
    const wMedia = /webp/.test(anu?.mime || '') ? rawBuffer : /jpeg|jpg|png/.test(anu?.mime || '') ? await imageToWebp(rawBuffer) : /video/.test(anu?.mime || '') ? await videoToWebp(rawBuffer) : "";
    const tmpFileIn = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(localTmpDir, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)
    if (data) {
        const img = new webp.Image()
        const wr = { a: global.author ? global.author : '', b: data.packname ? data.packname : global.packname ? global.packname : '', c: data.author ? data.author : global.author ? global.author : '', d: data.categories ? data.categories : [""], e: data.isAvatar ? data.isAvatar : 0 }
        const json = { 'sticker-pack-id': wr.a, 'sticker-pack-name': wr.b, 'sticker-pack-publisher': wr.c, 'emojis': wr.d, 'is-avatar-sticker': wr.e };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        try { fs.unlinkSync(tmpFileIn) } catch (e) {}
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

module.exports = { imageToWebp, videoToWebp, writeExif }
