const fs = require('fs');
const path = require('path');
const { randomBytes, createHash } = require('crypto');
const { spawn, execSync } = require('child_process');
const {
    proto,
    downloadContentFromMessage,
    prepareWAMessageMedia,
    normalizeMessageContent
} = require('@whiskeysockets/baileys');
const exifUtil = require('../utils/exif');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

const SESSION_TTL = 5 * 60 * 1000;
const SESSION_CAP = 20;
const MEM = (global.SAUDIO_SESSIONS = global.SAUDIO_SESSIONS || new Map());
const TMP_DIR = path.join(process.cwd(), 'tmp');
const AUDIO_STORE_PATH = path.join(process.cwd(), 'data', 'audio-stickers.json');
const AUDIO_STORE_TTL_MS = 72 * 60 * 60 * 1000; // 72 jam
const AUDIO_STORE_MAX = 200;
const AUDIO_BUF_CACHE_MAX = 40;
const AUDIO_BUF_CACHE_TTL_MS = 30 * 60 * 1000;

const AUDIO_META_BY_ID = (global._AUDIO_STICKER_BY_ID = global._AUDIO_STICKER_BY_ID || new Map());
const AUDIO_META_BY_SHA = (global._AUDIO_STICKER_BY_SHA = global._AUDIO_STICKER_BY_SHA || new Map());
const AUDIO_BUF_CACHE = (global._AUDIO_STICKER_BUF_CACHE = global._AUDIO_STICKER_BUF_CACHE || new Map());
let audioStoreLoaded = false;
let audioStoreSaveTimer = null;

const pendingEncodes = new Map();
let origMessageEncode = null;

function ensureTmpDir() {
    try {
        if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    } catch (_) {}
}

function makeTmpFile(prefix, ext) {
    ensureTmpDir();
    return path.join(TMP_DIR, `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`);
}

function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
}

function resolveFfmpegBin() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
        return process.env.FFMPEG_PATH;
    }
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return 'ffmpeg';
    } catch (_) {}
    try {
        const ff = require('@ffmpeg-installer/ffmpeg');
        if (ff && ff.path) {
            try { fs.chmodSync(ff.path, 0o755); } catch (_) {}
            return ff.path;
        }
    } catch (_) {}
    return 'ffmpeg';
}

const FFMPEG_BIN = resolveFfmpegBin();

function varint(n) {
    let v = BigInt(n);
    const out = [];
    while (v > 127n) {
        out.push(Number((v & 127n) | 128n));
        v >>= 7n;
    }
    out.push(Number(v));
    return Buffer.from(out);
}

function ld(field, body) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    return Buffer.concat([varint((field << 3) | 2), varint(buf.length), buf]);
}

function toBufStrict(val) {
    if (!val) return Buffer.alloc(0);
    if (Buffer.isBuffer(val)) return val;
    if (val instanceof Uint8Array) return Buffer.from(val);
    if (typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) {
        return Buffer.from(val.data);
    }
    if (typeof val === 'string') return Buffer.from(val, 'base64');
    return Buffer.alloc(0);
}

function toNum(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'number') return val;
    if (typeof val === 'object') {
        if (typeof val.toNumber === 'function') return val.toNumber();
        if (typeof val.low === 'number') return val.low;
    }
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

function sha256B64(buf) {
    if (!buf || !buf.length) return '';
    return createHash('sha256').update(buf).digest('base64');
}

function runFFmpeg(args, input = null) {
    return new Promise((resolve, reject) => {
        const p = spawn(FFMPEG_BIN, args);
        const out = [];
        let err = '';
        p.stdout.on('data', d => out.push(d));
        p.stderr.on('data', d => { err += d; });
        p.on('error', reject);
        p.on('close', code => {
            if (code !== 0) return reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`));
            resolve(Buffer.concat(out));
        });
        if (input !== null && input !== undefined) {
            p.stdin.on('error', () => {});
            p.stdin.end(input);
        } else {
            p.stdin.end();
        }
    });
}

/**
 * Hitung durasi (detik) dari kontainer Ogg Opus berdasarkan granule position terakhir (48 kHz).
 */
function parseOggOpusDurationSec(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 28) return 0;
    let maxGranule = 0n;
    for (let i = 0; i <= buf.length - 27; i++) {
        if (buf[i] === 0x4f && buf[i + 1] === 0x67 && buf[i + 2] === 0x67 && buf[i + 3] === 0x53) {
            const g = buf.readBigInt64LE(i + 6);
            if (g > maxGranule) maxGranule = g;
            const segCount = buf[i + 26];
            let pageDataLen = 0;
            for (let s = 0; s < segCount && i + 27 + s < buf.length; s++) {
                pageDataLen += buf[i + 27 + s];
            }
            i += 26 + segCount + pageDataLen;
        }
    }
    if (maxGranule <= 0n) return 0;
    return Number(maxGranule) / 48000;
}

/**
 * Hasilkan 64-byte waveform standar WhatsApp (0..100) agar iOS & Android memutar audio stiker dengan sempurna.
 */
async function computeAudioWaveform(filePath) {
    const fallback = Buffer.alloc(64);
    for (let i = 0; i < 64; i++) {
        fallback[i] = Math.round(25 + 45 * Math.abs(Math.sin(i * 0.35)));
    }
    try {
        const pcm = await runFFmpeg([
            '-v', 'error',
            '-i', filePath,
            '-vn',
            '-ac', '1',
            '-ar', '8000',
            '-f', 's16le',
            'pipe:1'
        ]);
        const sampleCount = Math.floor(pcm.length / 2);
        if (sampleCount < 64) return fallback;
        const bars = 64;
        const blockSize = Math.max(1, Math.floor(sampleCount / bars));
        const raw = new Float64Array(bars);
        let peak = 0;
        for (let b = 0; b < bars; b++) {
            const start = b * blockSize;
            const end = Math.min(sampleCount, start + blockSize);
            let sum = 0;
            for (let s = start; s < end; s++) {
                sum += Math.abs(pcm.readInt16LE(s * 2));
            }
            const avg = sum / Math.max(1, end - start);
            raw[b] = avg;
            if (avg > peak) peak = avg;
        }
        if (peak <= 0) return fallback;
        const out = Buffer.alloc(bars);
        for (let b = 0; b < bars; b++) {
            out[b] = Math.min(100, Math.max(5, Math.round((raw[b] / peak) * 100)));
        }
        return out;
    } catch (_) {
        return fallback;
    }
}

async function toOpus(input, extHint = 'bin', maxDurationSec = 20) {
    const capSec = Math.max(1, Math.min(20, Number(maxDurationSec) || 20));
    const inFile = makeTmpFile('saudio_ain', extHint);
    const outFile = makeTmpFile('saudio_aout', 'ogg');
    try {
        await fs.promises.writeFile(inFile, input);
        const args = [
            '-y',
            '-v', 'error',
            '-i', inFile,
            '-vn',
            '-map', '0:a:0',
            '-map_metadata', '-1',
            '-c:a', 'libopus',
            '-b:a', '64k',
            '-ar', '48000',
            '-ac', '1',
            '-t', String(capSec),
            '-f', 'ogg',
            outFile
        ];

        await runFFmpeg(args);
        const buf = await fs.promises.readFile(outFile);
        if (!buf || buf.length < 64) {
            throw new Error('Track audio kosong atau tidak ditemukan pada media.');
        }
        const parsedSec = parseOggOpusDurationSec(buf);
        const seconds = Math.max(1, Math.min(capSec, Math.round(parsedSec || 1)));
        const waveform = await computeAudioWaveform(outFile);
        return { buf, mimetype: 'audio/ogg; codecs=opus', seconds, waveform };
    } finally {
        safeUnlink(inFile);
        safeUnlink(outFile);
    }
}

/**
 * Konversi visual menjadi WebP animasi 512x512.
 * WhatsApp iOS hanya memutar audio pada stiker berstatus ANIMATED (VP8X + ANIM/ANMF, isAnimated: true).
 * Jika input berupa gambar diam / stiker statis, secara otomatis dibungkus menjadi 2-frame WebP animasi ringan
 * sehingga visual tetap tampak diam tetapi audio 100% berbunyi di iPhone (iOS) maupun Android!
 */
async function toWebp(input, { ensureAnimated = true } = {}) {
    if (
        input.length >= 30 &&
        input.toString('ascii', 0, 4) === 'RIFF' &&
        input.toString('ascii', 8, 12) === 'WEBP'
    ) {
        try {
            const info = parseWebp(input);
            if (info.isAnimated) {
                return input;
            }
            if (!ensureAnimated && info.width > 0 && info.width === info.height && info.width <= 512) {
                return input;
            }
        } catch (_) {
            if (!ensureAnimated) return input;
        }
    }

    const inFile = makeTmpFile('saudio_img_in', 'img');
    const pngFile = makeTmpFile('saudio_img_png', 'png');
    const outFile = makeTmpFile('saudio_img_out', 'webp');
    try {
        let preparedPng = null;
        if (sharp) {
            try {
                preparedPng = await sharp(input)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();
            } catch (_) {}
        }
        if (preparedPng) {
            await fs.promises.writeFile(pngFile, preparedPng);
        } else {
            await fs.promises.writeFile(inFile, input);
            await runFFmpeg([
                '-y', '-v', 'error',
                '-i', inFile,
                '-frames:v', '1',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                '-f', 'image2',
                pngFile
            ]);
        }

        if (ensureAnimated) {
            for (const codec of ['libwebp_anim', 'libwebp']) {
                safeUnlink(outFile);
                try {
                    await runFFmpeg([
                        '-y', '-v', 'error',
                        '-loop', '1',
                        '-framerate', '2',
                        '-i', pngFile,
                        '-t', '1',
                        '-frames:v', '2',
                        '-c:v', codec,
                        '-lossless', '0',
                        '-compression_level', '4',
                        '-q:v', '80',
                        '-loop', '0',
                        '-f', 'webp',
                        outFile
                    ]);
                    const animBuf = await fs.promises.readFile(outFile);
                    if (animBuf && animBuf.length > 30 && parseWebp(animBuf).isAnimated) {
                        return animBuf;
                    }
                } catch (_) {}
            }
        }

        // Fallback static WebP jika libwebp_anim tidak tersedia
        safeUnlink(outFile);
        await runFFmpeg([
            '-y', '-v', 'error',
            '-i', pngFile,
            '-frames:v', '1',
            '-c:v', 'libwebp',
            '-q:v', '85',
            '-f', 'webp',
            outFile
        ]);
        const staticBuf = await fs.promises.readFile(outFile);
        if (staticBuf && staticBuf.length > 30) return staticBuf;
        throw new Error('Gagal mengonversi gambar ke WebP.');
    } finally {
        safeUnlink(inFile);
        safeUnlink(pngFile);
        safeUnlink(outFile);
    }
}

async function videoToWebp(videoBuf, { staticOnly = false, maxDuration = 8 } = {}) {
    const inFile = makeTmpFile('saudio_vin', 'mp4');
    const outFile = makeTmpFile('saudio_vout', 'webp');
    try {
        await fs.promises.writeFile(inFile, videoBuf);

        if (!staticOnly) {
            const presets = [
                { dur: maxDuration, fps: 12, q: 55, scale: 512 },
                { dur: Math.min(maxDuration, 6), fps: 10, q: 35, scale: 512 },
                { dur: Math.min(maxDuration, 5), fps: 8, q: 25, scale: 384 }
            ];
            let lastAnimBuf = null;
            for (const preset of presets) {
                let encoded = null;
                for (const codec of ['libwebp_anim', 'libwebp']) {
                    safeUnlink(outFile);
                    try {
                        const vf = `fps=${preset.fps},scale=${preset.scale}:${preset.scale}:force_original_aspect_ratio=increase,crop=${preset.scale}:${preset.scale}`;
                        await runFFmpeg([
                            '-y',
                            '-v', 'error',
                            '-i', inFile,
                            '-t', String(preset.dur),
                            '-an',
                            '-vf', vf,
                            '-c:v', codec,
                            '-lossless', '0',
                            '-compression_level', '4',
                            '-q:v', String(preset.q),
                            '-loop', '0',
                            '-preset', 'default',
                            '-f', 'webp',
                            outFile
                        ]);
                        const buf = await fs.promises.readFile(outFile);
                        if (buf && buf.length > 30) {
                            encoded = buf;
                            break;
                        }
                    } catch (_) {}
                }
                if (encoded) {
                    lastAnimBuf = encoded;
                    if (encoded.length <= 490 * 1024) {
                        return encoded;
                    }
                }
            }
            if (lastAnimBuf && lastAnimBuf.length <= 950 * 1024) {
                return lastAnimBuf;
            }
        }

        // Ambil 1 frame lalu bungkus jadi 2-frame animated WebP agar iOS tetap bisa memutar audionya!
        const framePng = makeTmpFile('saudio_vframe', 'png');
        try {
            await runFFmpeg([
                '-y', '-v', 'error',
                '-i', inFile,
                '-frames:v', '1',
                '-an',
                '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
                '-f', 'image2',
                framePng
            ]);
            const frameBuf = await fs.promises.readFile(framePng);
            return await toWebp(frameBuf, { ensureAnimated: true });
        } finally {
            safeUnlink(framePng);
        }
    } finally {
        safeUnlink(inFile);
        safeUnlink(outFile);
    }
}

async function extractFromVideo(videoBuf, options = {}) {
    const [visualRes, audioRes] = await Promise.allSettled([
        videoToWebp(videoBuf, {
            staticOnly: Boolean(options.staticOnly),
            maxDuration: options.maxDuration || 8
        }),
        toOpus(videoBuf, 'mp4', options.maxAudioDuration || 20)
    ]);

    const visualBuf = visualRes.status === 'fulfilled' ? visualRes.value : null;
    const audioBuf = audioRes.status === 'fulfilled' ? audioRes.value.buf : null;

    return {
        visualBuf,
        audioBuf,
        hasAudio: Boolean(audioBuf && audioBuf.length > 64),
        visualError: visualRes.status === 'rejected' ? visualRes.reason?.message : null,
        audioError: audioRes.status === 'rejected' ? audioRes.reason?.message : null
    };
}

function parseWebp(b) {
    if (
        b.length < 30 ||
        b.toString('ascii', 0, 4) !== 'RIFF' ||
        b.toString('ascii', 8, 12) !== 'WEBP'
    ) {
        throw new Error('File WebP tidak valid.');
    }
    const c = b.toString('ascii', 12, 16);
    if (c === 'VP8 ') {
        return {
            width: b.readUInt16LE(26) & 0x3fff,
            height: b.readUInt16LE(28) & 0x3fff,
            isAnimated: false
        };
    }
    if (c === 'VP8L') {
        return {
            width: 1 + (b[21] | ((b[22] & 0x3f) << 8)),
            height: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)),
            isAnimated: false
        };
    }
    if (c === 'VP8X') {
        return {
            width: 1 + b.readUIntLE(24, 3),
            height: 1 + b.readUIntLE(27, 3),
            isAnimated: (b[20] & 2) !== 0
        };
    }
    throw new Error('Header chunk WebP tidak didukung.');
}

function applyWatermarkToWebp(webpBuf, { packname, author, categories = ['🎵'] } = {}) {
    try {
        const finalPack = packname || global.packname || global.botname || 'HuTao - MD';
        const finalAuthor = author || global.namaOwner || global.author || 'DinzID';
        const exifBuf = exifUtil.createStickerExifBuffer({
            packname: finalPack,
            author: finalAuthor,
            categories
        });
        const injected = exifUtil.injectWebpExifBuffer(webpBuf, exifBuf);
        if (Buffer.isBuffer(injected) && injected.length > 30) {
            return injected;
        }
    } catch (_) {}
    return webpBuf;
}

// === AUDIO STICKER METADATA STORE (untuk .swm agar audio TIDAK hilang saat reply!) ===
// WhatsApp membuang audioMessage dari contextInfo.quotedMessage saat user reply ke sound sticker.
// Jadi kita simpan referensi metadata audio (berdasarkan msgId & sticker fileSha256) saat masuk/keluar.

function serializeAudioMeta(audioMsg) {
    if (!audioMsg || typeof audioMsg !== 'object') return null;
    if (!audioMsg.url && !audioMsg.directPath) return null;
    return {
        url: audioMsg.url || undefined,
        directPath: audioMsg.directPath || undefined,
        mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
        fileSha256: toBufStrict(audioMsg.fileSha256).toString('base64') || undefined,
        fileEncSha256: toBufStrict(audioMsg.fileEncSha256).toString('base64') || undefined,
        mediaKey: toBufStrict(audioMsg.mediaKey).toString('base64') || undefined,
        fileLength: toNum(audioMsg.fileLength, 0),
        seconds: toNum(audioMsg.seconds, 1),
        mediaKeyTimestamp: toNum(audioMsg.mediaKeyTimestamp, 0),
        waveform: audioMsg.waveform ? toBufStrict(audioMsg.waveform).toString('base64') : undefined
    };
}

function deserializeAudioMeta(meta) {
    if (!meta || typeof meta !== 'object') return null;
    return {
        url: meta.url,
        directPath: meta.directPath,
        mimetype: meta.mimetype || 'audio/ogg; codecs=opus',
        fileSha256: meta.fileSha256 ? Buffer.from(meta.fileSha256, 'base64') : undefined,
        fileEncSha256: meta.fileEncSha256 ? Buffer.from(meta.fileEncSha256, 'base64') : undefined,
        mediaKey: meta.mediaKey ? Buffer.from(meta.mediaKey, 'base64') : undefined,
        fileLength: meta.fileLength || 0,
        seconds: meta.seconds || 1,
        mediaKeyTimestamp: meta.mediaKeyTimestamp || 0,
        waveform: meta.waveform ? Buffer.from(meta.waveform, 'base64') : undefined
    };
}

function loadAudioStoreOnce() {
    if (audioStoreLoaded) return;
    audioStoreLoaded = true;
    try {
        if (!fs.existsSync(AUDIO_STORE_PATH)) return;
        const parsed = JSON.parse(fs.readFileSync(AUDIO_STORE_PATH, 'utf8'));
        const now = Date.now();
        if (Array.isArray(parsed)) {
            for (const entry of parsed) {
                if (!entry || !entry.audio || (now - (entry.ts || 0)) > AUDIO_STORE_TTL_MS) continue;
                if (entry.msgId) AUDIO_META_BY_ID.set(entry.msgId, entry);
                if (entry.stickerSha) AUDIO_META_BY_SHA.set(entry.stickerSha, entry);
            }
        }
    } catch (_) {}
}

function scheduleAudioStoreSave() {
    if (audioStoreSaveTimer) return;
    audioStoreSaveTimer = setTimeout(() => {
        audioStoreSaveTimer = null;
        try {
            const now = Date.now();
            const entries = [];
            const seen = new Set();
            for (const [k, v] of AUDIO_META_BY_ID.entries()) {
                if ((now - (v.ts || 0)) > AUDIO_STORE_TTL_MS) {
                    AUDIO_META_BY_ID.delete(k);
                    continue;
                }
                if (!seen.has(v)) {
                    seen.add(v);
                    entries.push(v);
                }
            }
            for (const [k, v] of AUDIO_META_BY_SHA.entries()) {
                if ((now - (v.ts || 0)) > AUDIO_STORE_TTL_MS) {
                    AUDIO_META_BY_SHA.delete(k);
                    continue;
                }
                if (!seen.has(v)) {
                    seen.add(v);
                    entries.push(v);
                }
            }
            const trimmed = entries.slice(-AUDIO_STORE_MAX);
            fs.mkdirSync(path.dirname(AUDIO_STORE_PATH), { recursive: true });
            fs.promises.writeFile(AUDIO_STORE_PATH, JSON.stringify(trimmed), 'utf8').catch(() => {});
        } catch (_) {}
    }, 3000);
    if (typeof audioStoreSaveTimer.unref === 'function') audioStoreSaveTimer.unref();
}

function storeAudioStickerEntry({ msgId, stickerSha, audioMsg, audioBuf }) {
    loadAudioStoreOnce();
    const serialized = serializeAudioMeta(audioMsg);
    if (!serialized) return;
    const entry = {
        msgId: msgId || '',
        stickerSha: stickerSha || '',
        audio: serialized,
        ts: Date.now()
    };
    if (msgId) {
        AUDIO_META_BY_ID.set(msgId, entry);
        if (AUDIO_META_BY_ID.size > AUDIO_STORE_MAX) {
            const oldest = AUDIO_META_BY_ID.keys().next().value;
            AUDIO_META_BY_ID.delete(oldest);
        }
    }
    if (stickerSha) {
        AUDIO_META_BY_SHA.set(stickerSha, entry);
        if (AUDIO_META_BY_SHA.size > AUDIO_STORE_MAX) {
            const oldest = AUDIO_META_BY_SHA.keys().next().value;
            AUDIO_META_BY_SHA.delete(oldest);
        }
    }
    if (Buffer.isBuffer(audioBuf) && audioBuf.length > 64) {
        const cacheKey = msgId || stickerSha;
        if (cacheKey) {
            AUDIO_BUF_CACHE.set(cacheKey, { buf: audioBuf, ts: Date.now() });
            if (AUDIO_BUF_CACHE.size > AUDIO_BUF_CACHE_MAX) {
                const oldest = AUDIO_BUF_CACHE.keys().next().value;
                AUDIO_BUF_CACHE.delete(oldest);
            }
        }
    }
    scheduleAudioStoreSave();
}

function extractAudioFromStickerContainer(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') return null;
    const candidates = [
        rawMessage.audioStickerMessage?.message?.stickerMessage,
        rawMessage.ephemeralMessage?.message?.audioStickerMessage?.message?.stickerMessage,
        rawMessage.viewOnceMessage?.message?.audioStickerMessage?.message?.stickerMessage,
        rawMessage.viewOnceMessageV2?.message?.audioStickerMessage?.message?.stickerMessage,
        rawMessage.stickerMessage
    ];
    try {
        const norm = typeof normalizeMessageContent === 'function' ? normalizeMessageContent(rawMessage) : null;
        if (norm?.stickerMessage) candidates.push(norm.stickerMessage);
    } catch (_) {}

    for (const sm of candidates) {
        if (sm && sm.audioMessage && (sm.audioMessage.url || sm.audioMessage.directPath)) {
            return {
                stickerMessage: sm,
                audioMessage: sm.audioMessage,
                stickerSha: toBufStrict(sm.fileSha256).toString('base64')
            };
        }
    }
    return null;
}

function recordIncomingAudioSticker(webMsg) {
    try {
        if (!webMsg || !webMsg.message) return false;
        const found = extractAudioFromStickerContainer(webMsg.message);
        if (!found) return false;
        storeAudioStickerEntry({
            msgId: webMsg.key?.id || '',
            stickerSha: found.stickerSha,
            audioMsg: found.audioMessage
        });
        return true;
    } catch (_) {
        return false;
    }
}

async function findAudioForQuotedSticker(m, store = null) {
    loadAudioStoreOnce();
    const quotedRaw = getQuotedRawMessage(m);
    const direct = extractAudioFromStickerContainer(quotedRaw);
    if (direct?.audioMessage) {
        const stream = await downloadContentFromMessage(direct.audioMessage, 'audio');
        const buf = await streamToBuffer(stream);
        if (buf.length > 64) return { audioBuf: buf, audioMsg: direct.audioMessage };
    }

    const quotedId = m?.quoted?.id || m?.quoted?.key?.id || '';
    const qSticker = quotedRaw?.stickerMessage
        || quotedRaw?.audioStickerMessage?.message?.stickerMessage
        || (typeof normalizeMessageContent === 'function' ? normalizeMessageContent(quotedRaw)?.stickerMessage : null);
    const stickerSha = qSticker?.fileSha256 ? toBufStrict(qSticker.fileSha256).toString('base64') : '';

    // 1. Cek cache buffer RAM terlebih dahulu (instan untuk stiker audio yg baru dikirim bot)
    const now = Date.now();
    for (const ck of [quotedId, stickerSha].filter(Boolean)) {
        const hit = AUDIO_BUF_CACHE.get(ck);
        if (hit && (now - hit.ts) < AUDIO_BUF_CACHE_TTL_MS && Buffer.isBuffer(hit.buf) && hit.buf.length > 64) {
            return { audioBuf: hit.buf, audioMsg: null };
        }
    }

    // 2. Cek metadata audioStickerStore berdasarkan msgId atau fileSha256
    let entry = (quotedId && AUDIO_META_BY_ID.get(quotedId))
        || (stickerSha && AUDIO_META_BY_SHA.get(stickerSha))
        || null;

    // 3. Fallback ke Baileys in-memory store.loadMessage
    if (!entry && store && quotedId && m?.chat) {
        try {
            const origMsg = await store.loadMessage(m.chat, quotedId);
            const fromOrig = extractAudioFromStickerContainer(origMsg?.message);
            if (fromOrig?.audioMessage) {
                const stream = await downloadContentFromMessage(fromOrig.audioMessage, 'audio');
                const buf = await streamToBuffer(stream);
                if (buf.length > 64) return { audioBuf: buf, audioMsg: fromOrig.audioMessage };
            }
        } catch (_) {}
    }

    if (entry && entry.audio) {
        try {
            const audioObj = deserializeAudioMeta(entry.audio);
            if (audioObj && (audioObj.url || audioObj.directPath) && audioObj.mediaKey) {
                const stream = await downloadContentFromMessage(audioObj, 'audio');
                const buf = await streamToBuffer(stream);
                if (buf.length > 64) return { audioBuf: buf, audioMsg: audioObj };
            }
        } catch (_) {}
    }

    return null;
}

function mediaDomainInfo(keyBuf) {
    return ld(74, Buffer.concat([Buffer.from([0x08, 0x01]), ld(2, keyBuf)]));
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function extractMediaFromRawMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') return null;
    const msg = typeof normalizeMessageContent === 'function'
        ? normalizeMessageContent(rawMessage) || rawMessage
        : rawMessage;

    if (msg.audioMessage) {
        const stream = await downloadContentFromMessage(msg.audioMessage, 'audio');
        const buf = await streamToBuffer(stream);
        if (buf.length) return { kind: 'audio', buf, mime: msg.audioMessage.mimetype || 'audio/ogg' };
    }
    if (msg.videoMessage) {
        const stream = await downloadContentFromMessage(msg.videoMessage, 'video');
        const buf = await streamToBuffer(stream);
        if (buf.length) {
            return {
                kind: 'video',
                buf,
                mime: msg.videoMessage.mimetype || 'video/mp4',
                seconds: toNum(msg.videoMessage.seconds, 0)
            };
        }
    }
    if (msg.ptvMessage) {
        const stream = await downloadContentFromMessage(msg.ptvMessage, 'video');
        const buf = await streamToBuffer(stream);
        if (buf.length) {
            return {
                kind: 'video',
                buf,
                mime: msg.ptvMessage.mimetype || 'video/mp4',
                seconds: toNum(msg.ptvMessage.seconds, 0)
            };
        }
    }
    if (msg.stickerMessage) {
        const stream = await downloadContentFromMessage(msg.stickerMessage, 'sticker');
        const buf = await streamToBuffer(stream);
        if (buf.length) return { kind: 'visual', buf, mime: msg.stickerMessage.mimetype || 'image/webp' };
    }
    if (msg.imageMessage) {
        const stream = await downloadContentFromMessage(msg.imageMessage, 'image');
        const buf = await streamToBuffer(stream);
        if (buf.length) return { kind: 'visual', buf, mime: msg.imageMessage.mimetype || 'image/jpeg' };
    }
    if (msg.documentMessage) {
        const mime = String(msg.documentMessage.mimetype || '').toLowerCase();
        if (mime.startsWith('audio/') || mime.startsWith('image/') || mime.startsWith('video/')) {
            const stream = await downloadContentFromMessage(msg.documentMessage, 'document');
            const buf = await streamToBuffer(stream);
            if (buf.length) {
                const kind = mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'visual';
                return { kind, buf, mime };
            }
        }
    }
    return null;
}

function getQuotedRawMessage(m) {
    if (!m) return null;
    if (m.quoted?.message) return m.quoted.message;
    const raw = typeof normalizeMessageContent === 'function'
        ? normalizeMessageContent(m.message) || m.message
        : m.message;
    if (!raw || typeof raw !== 'object') return null;
    for (const key of Object.keys(raw)) {
        const node = raw[key];
        if (node && typeof node === 'object' && node.contextInfo?.quotedMessage) {
            return node.contextInfo.quotedMessage;
        }
    }
    return null;
}

function getSession(sender) {
    const s = MEM.get(sender);
    if (!s) return null;
    if (Date.now() - s.ts > SESSION_TTL) {
        MEM.delete(sender);
        return null;
    }
    return s;
}

function setSession(sender, data) {
    if (MEM.size >= SESSION_CAP && !MEM.has(sender)) {
        const oldest = MEM.keys().next().value;
        MEM.delete(oldest);
    }
    data.ts = Date.now();
    MEM.set(sender, data);
}

function clearSession(sender) {
    MEM.delete(sender);
}

function installEncodeHook(MessageProto) {
    if (origMessageEncode) return;
    origMessageEncode = MessageProto.encode;
    MessageProto.encode = function hookedMessageEncode(msg, w) {
        const msgSecret = msg?.messageContextInfo?.messageSecret;
        if (msgSecret && pendingEncodes.size > 0) {
            const hex = toBufStrict(msgSecret).toString('hex');
            const entry = pendingEncodes.get(hex);
            if (entry) {
                const cleanMsg = { messageContextInfo: msg.messageContextInfo };
                const out = origMessageEncode.call(this, cleanMsg, w);
                if (out && typeof out.uint32 === 'function') {
                    out.uint32((134 << 3) | 2).bytes(entry.futureProofBody);
                    return out;
                }
                if (out instanceof Uint8Array) {
                    return Buffer.concat([Buffer.from(out), entry.rawField134]);
                }
                return out;
            }
        }
        return origMessageEncode.call(this, msg, w);
    };
}

function uninstallEncodeHookIfIdle(MessageProto) {
    if (pendingEncodes.size === 0 && origMessageEncode) {
        MessageProto.encode = origMessageEncode;
        origMessageEncode = null;
    }
}

function hasNativeAudioStickerProto(MessageProto) {
    return Boolean(
        MessageProto &&
        MessageProto.prototype &&
        'audioStickerMessage' in MessageProto.prototype &&
        MessageProto.StickerMessage &&
        MessageProto.StickerMessage.prototype &&
        'audioMessage' in MessageProto.StickerMessage.prototype
    );
}

async function sendStickerAudio(Dinz, jid, audioBuf, visualBuf, opts = {}) {
    const MessageProto = proto?.Message;
    if (!MessageProto?.AudioMessage || !MessageProto?.StickerMessage) {
        throw new Error('Encoder AudioMessage/StickerMessage tidak ditemukan di Baileys WAProto.');
    }

    const [opus, rawStickerBuf] = await Promise.all([
        toOpus(audioBuf, 'bin', opts.maxAudioDuration || 20),
        toWebp(visualBuf, { ensureAnimated: true })
    ]);

    // Sisipkan watermark EXIF (packname & author) secara lossless tanpa merusak frame animasi
    const stickerBuf = applyWatermarkToWebp(rawStickerBuf, {
        packname: opts.packname,
        author: opts.author,
        categories: opts.categories || ['🎵']
    });
    const webp = parseWebp(stickerBuf);

    const [upAudio, upSticker] = await Promise.all([
        prepareWAMessageMedia(
            { audio: opus.buf, mimetype: opus.mimetype, seconds: opus.seconds, ptt: false },
            { upload: Dinz.waUploadToServer }
        ),
        prepareWAMessageMedia(
            { sticker: stickerBuf, mimetype: 'image/webp' },
            { upload: Dinz.waUploadToServer }
        )
    ]);

    const a = upAudio?.audioMessage;
    const s = upSticker?.stickerMessage;
    if (!a || !s) {
        throw new Error('Gagal mengunggah media audio/stiker ke server WhatsApp.');
    }

    const aKey = toBufStrict(a.mediaKey);
    const sKey = toBufStrict(s.mediaKey);
    const nowSec = Math.floor(Date.now() / 1000);
    const stickerShaB64 = toBufStrict(s.fileSha256).toString('base64') || sha256B64(stickerBuf);

    const audioMsgObj = {
        url: a.url,
        mimetype: opus.mimetype,
        fileSha256: toBufStrict(a.fileSha256),
        fileEncSha256: toBufStrict(a.fileEncSha256),
        fileLength: toNum(a.fileLength, opus.buf.length),
        seconds: opus.seconds,
        ptt: false,
        mediaKey: aKey,
        directPath: a.directPath,
        mediaKeyTimestamp: toNum(a.mediaKeyTimestamp, nowSec),
        waveform: opus.waveform,
        contextInfo: {
            mediaDomainInfo: {
                mediaKeyDomain: 1,
                e2EeMediaKey: aKey
            }
        }
    };

    const stickerMsgObj = {
        url: s.url,
        fileSha256: toBufStrict(s.fileSha256),
        fileEncSha256: toBufStrict(s.fileEncSha256),
        mediaKey: sKey,
        mimetype: 'image/webp',
        height: webp.height || 512,
        width: webp.width || 512,
        directPath: s.directPath,
        fileLength: toNum(s.fileLength, stickerBuf.length),
        mediaKeyTimestamp: toNum(s.mediaKeyTimestamp, nowSec),
        isAnimated: Boolean(webp.isAnimated),
        stickerSentTs: Date.now(),
        premium: 0,
        emojis: '🎵',
        audioMessage: audioMsgObj,
        contextInfo: {
            mediaDomainInfo: {
                mediaKeyDomain: 1,
                e2EeMediaKey: sKey
            }
        }
    };

    let sentRes = null;

    if (hasNativeAudioStickerProto(MessageProto)) {
        // Jalur native hutao-baileys: field 134 (audioStickerMessage) + field 26 (audioMessage)
        // + otomatis mengirim stanza type="media" dan <enc mediatype="sticker"> (WAJIB untuk iOS!)
        const nativePayload = {
            audioStickerMessage: {
                message: {
                    stickerMessage: stickerMsgObj
                }
            },
            messageContextInfo: {
                messageSecret: randomBytes(32)
            }
        };
        sentRes = await Dinz.relayMessage(jid, nativePayload, { AI: false });
    } else {
        // Fallback jika Baileys belum ter-upgrade: tetap kirim sebagai type="media" + mediatype="sticker"!
        const audioBytes = Buffer.concat([
            Buffer.from(MessageProto.AudioMessage.encode({
                url: audioMsgObj.url,
                mimetype: audioMsgObj.mimetype,
                fileSha256: audioMsgObj.fileSha256,
                fileEncSha256: audioMsgObj.fileEncSha256,
                fileLength: audioMsgObj.fileLength,
                seconds: audioMsgObj.seconds,
                ptt: false,
                mediaKey: audioMsgObj.mediaKey,
                directPath: audioMsgObj.directPath,
                mediaKeyTimestamp: audioMsgObj.mediaKeyTimestamp,
                waveform: audioMsgObj.waveform
            }).finish()),
            ld(17, mediaDomainInfo(aKey))
        ]);

        const stickerBase = Buffer.concat([
            Buffer.from(MessageProto.StickerMessage.encode({
                url: stickerMsgObj.url,
                fileSha256: stickerMsgObj.fileSha256,
                fileEncSha256: stickerMsgObj.fileEncSha256,
                mediaKey: stickerMsgObj.mediaKey,
                mimetype: stickerMsgObj.mimetype,
                height: stickerMsgObj.height,
                width: stickerMsgObj.width,
                directPath: stickerMsgObj.directPath,
                fileLength: stickerMsgObj.fileLength,
                mediaKeyTimestamp: stickerMsgObj.mediaKeyTimestamp,
                isAnimated: stickerMsgObj.isAnimated,
                stickerSentTs: stickerMsgObj.stickerSentTs,
                premium: 0,
                emojis: '🎵'
            }).finish()),
            ld(17, mediaDomainInfo(sKey))
        ]);

        const futureProofBody = ld(1, ld(26, Buffer.concat([stickerBase, ld(26, audioBytes)])));
        const secret = randomBytes(32);
        const secretHex = secret.toString('hex');
        const rawField134 = ld(134, futureProofBody);

        // Gunakan stickerMessage dummy agar Baileys menandai stanza sebagai type="media" & mediatype="sticker"
        const payload = {
            stickerMessage: { mimetype: 'image/webp' },
            messageContextInfo: {
                messageSecret: secret
            }
        };

        installEncodeHook(MessageProto);
        pendingEncodes.set(secretHex, { futureProofBody, rawField134 });
        try {
            sentRes = await Dinz.relayMessage(jid, payload, { AI: false });
        } finally {
            pendingEncodes.delete(secretHex);
            uninstallEncodeHookIfIdle(MessageProto);
        }
    }

    const sentMsgId = (typeof sentRes === 'string' ? sentRes : sentRes?.key?.id) || '';
    storeAudioStickerEntry({
        msgId: sentMsgId,
        stickerSha: stickerShaB64,
        audioMsg: audioMsgObj,
        audioBuf: opus.buf
    });
    return sentRes;
}

module.exports = {
    extractMediaFromRawMessage,
    getQuotedRawMessage,
    getSession,
    setSession,
    clearSession,
    sendStickerAudio,
    extractFromVideo,
    videoToWebp,
    parseWebp,
    parseOggOpusDurationSec,
    applyWatermarkToWebp,
    recordIncomingAudioSticker,
    findAudioForQuotedSticker,
    extractAudioFromStickerContainer,
    toOpus,
    toWebp,
    varint,
    ld
};
