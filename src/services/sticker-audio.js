const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { spawn, execSync } = require('child_process');
const {
    proto,
    downloadContentFromMessage,
    prepareWAMessageMedia,
    normalizeMessageContent
} = require('@whiskeysockets/baileys');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

const SESSION_TTL = 5 * 60 * 1000;
const SESSION_CAP = 20;
const MEM = (global.SAUDIO_SESSIONS = global.SAUDIO_SESSIONS || new Map());
const TMP_DIR = path.join(process.cwd(), 'tmp');

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
    return Buffer.from(String(val), 'base64');
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

async function toOpus(input, extHint = 'bin', maxDurationSec = 60) {
    if (input.length >= 4 && input.subarray(0, 4).toString('ascii') === 'OggS') {
        return { buf: input, mimetype: 'audio/ogg; codecs=opus' };
    }
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
            '-ac', '1'
        ];
        if (maxDurationSec > 0) {
            args.push('-t', String(maxDurationSec));
        }
        args.push('-f', 'ogg', outFile);

        await runFFmpeg(args);
        const buf = await fs.promises.readFile(outFile);
        if (!buf || buf.length < 64) {
            throw new Error('Track audio kosong atau tidak ditemukan pada media.');
        }
        return { buf, mimetype: 'audio/ogg; codecs=opus' };
    } finally {
        safeUnlink(inFile);
        safeUnlink(outFile);
    }
}

async function toWebp(input) {
    if (
        input.length >= 30 &&
        input.toString('ascii', 0, 4) === 'RIFF' &&
        input.toString('ascii', 8, 12) === 'WEBP'
    ) {
        try {
            const info = parseWebp(input);
            if (info.isAnimated || (info.width > 0 && info.width === info.height && info.width <= 512)) {
                return input;
            }
        } catch (_) {
            return input;
        }
    }
    try {
        return await runFFmpeg([
            '-v', 'error',
            '-i', 'pipe:0',
            '-frames:v', '1',
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
            '-c:v', 'libwebp',
            '-q:v', '85',
            '-f', 'webp',
            'pipe:1'
        ], input);
    } catch (ffErr) {
        if (sharp) {
            return await sharp(input)
                .resize(512, 512, { fit: 'cover', position: 'centre' })
                .webp({ quality: 85 })
                .toBuffer();
        }
        throw ffErr;
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
                    if (encoded.length <= 500 * 1024) {
                        return encoded;
                    }
                }
            }
            if (lastAnimBuf && lastAnimBuf.length <= 950 * 1024) {
                return lastAnimBuf;
            }
        }

        safeUnlink(outFile);
        await runFFmpeg([
            '-y',
            '-v', 'error',
            '-i', inFile,
            '-frames:v', '1',
            '-an',
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
            '-c:v', 'libwebp',
            '-q:v', '80',
            '-f', 'webp',
            outFile
        ]);
        const staticBuf = await fs.promises.readFile(outFile);
        if (!staticBuf || staticBuf.length < 30) {
            throw new Error('Gagal mengekstrak gambar dari video.');
        }
        return staticBuf;
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
        toOpus(videoBuf, 'mp4', options.maxAudioDuration || 60)
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

async function sendStickerAudio(Dinz, jid, audioBuf, visualBuf) {
    const MessageProto = proto?.Message;
    if (!MessageProto?.AudioMessage || !MessageProto?.StickerMessage) {
        throw new Error('Encoder AudioMessage/StickerMessage tidak ditemukan di Baileys WAProto.');
    }

    const [opus, stickerBuf] = await Promise.all([
        toOpus(audioBuf),
        toWebp(visualBuf)
    ]);
    const webp = parseWebp(stickerBuf);

    const [upAudio, upSticker] = await Promise.all([
        prepareWAMessageMedia(
            { audio: opus.buf, mimetype: opus.mimetype, seconds: 1 },
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

    const audioBytes = Buffer.concat([
        Buffer.from(MessageProto.AudioMessage.encode({
            url: a.url,
            mimetype: opus.mimetype,
            fileSha256: toBufStrict(a.fileSha256),
            fileEncSha256: toBufStrict(a.fileEncSha256),
            fileLength: toNum(a.fileLength, opus.buf.length),
            mediaKey: aKey,
            directPath: a.directPath,
            mediaKeyTimestamp: toNum(a.mediaKeyTimestamp, nowSec)
        }).finish()),
        ld(17, mediaDomainInfo(aKey))
    ]);

    const stickerBase = Buffer.concat([
        Buffer.from(MessageProto.StickerMessage.encode({
            url: s.url,
            fileSha256: toBufStrict(s.fileSha256),
            fileEncSha256: toBufStrict(s.fileEncSha256),
            mediaKey: sKey,
            mimetype: 'image/webp',
            height: webp.height,
            width: webp.width,
            directPath: s.directPath,
            fileLength: toNum(s.fileLength, stickerBuf.length),
            mediaKeyTimestamp: toNum(s.mediaKeyTimestamp, nowSec),
            isAnimated: webp.isAnimated,
            stickerSentTs: Date.now()
        }).finish()),
        ld(17, Buffer.concat([
            mediaDomainInfo(sKey),
            ld(82, varint(13001))
        ]))
    ]);

    const futureProofBody = ld(1, ld(26, Buffer.concat([stickerBase, ld(26, audioBytes)])));
    const secret = randomBytes(32);
    const secretHex = secret.toString('hex');
    const rawField134 = ld(134, futureProofBody);

    const payload = {
        extendedTextMessage: { text: ' ' },
        messageContextInfo: {
            messageSecret: secret
        }
    };

    installEncodeHook(MessageProto);
    pendingEncodes.set(secretHex, { futureProofBody, rawField134 });
    try {
        await Dinz.relayMessage(jid, payload, {
            additionalAttributes: { type: 'text' },
            AI: false
        });
    } finally {
        pendingEncodes.delete(secretHex);
        uninstallEncodeHookIfIdle(MessageProto);
    }
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
    toOpus,
    toWebp,
    varint,
    ld
};
