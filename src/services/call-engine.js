const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const axios = require('axios');
const youtubeService = require('./youtube');

const ROOT_DIR = process.cwd();
const BIN_NAME = process.platform === 'win32' ? 'meowcaller-bridge.exe' : 'meowcaller-bridge';
const BIN_PATH = path.join(ROOT_DIR, 'bin', BIN_NAME);
const SETUP_SCRIPT = path.join(ROOT_DIR, 'scripts', 'setup-caller.sh');
const CALL_DB_PATH = path.join(ROOT_DIR, 'data', 'caller-session.db');
const CALL_TMP_DIR = path.join(ROOT_DIR, 'tmp', 'call-media');

const CALL_PORT = parseInt(process.env.CALL_BRIDGE_PORT || process.env.SHIKI_CALL_PORT || '19842', 10) || 19842;
const CALL_BASE_URL = `http://127.0.0.1:${CALL_PORT}`;
const CALL_TOKEN = process.env.CALL_BRIDGE_TOKEN || process.env.SHIKI_CALL_TOKEN || crypto.randomBytes(16).toString('hex');

const DEFAULT_VIDEO_FPS = 24;
const DEFAULT_CALL_QUALITY = '480p';
const DEFAULT_AUDIO_QUALITY = 'clear';
const REQUIRED_GROUP_BRIDGE_VERSION = '2.3.0';
const MAX_CALL_DURATION_SEC = 420;

const CALL_QUALITY_PRESETS = {
    '360p': {
        key: '360p',
        name: '360p (Hemat)',
        ytRes: '360',
        scale: 'scale=-2:360',
        fps: 20,
        bitrate: '600k',
        maxrate: '900k',
        bufsize: '1800k',
        videoLabel: '360p 20 fps (Hemat)'
    },
    '480p': {
        key: '480p',
        name: '480p (Standard)',
        ytRes: '480',
        scale: 'scale=-2:480',
        fps: 24,
        bitrate: '1000k',
        maxrate: '1500k',
        bufsize: '3000k',
        videoLabel: '480p 24 fps (Standard)'
    },
    '720p': {
        key: '720p',
        name: '720p (HD)',
        ytRes: '720',
        scale: 'scale=-2:720',
        fps: 30,
        bitrate: '1600k',
        maxrate: '2200k',
        bufsize: '4400k',
        videoLabel: '720p 30 fps (HD)'
    }
};

const CALL_AUDIO_PRESETS = {
    low: {
        key: 'low',
        name: 'Hemat (16 kHz PCM Ringan)',
        sampleRate: '16000',
        filter: 'highpass=f=85,lowpass=f=6400,dynaudnorm=f=150:g=11,volume=0.88',
        label: '16 kHz PCM Ringan (MLow)'
    },
    normal: {
        key: 'normal',
        name: 'Standard (16 kHz PCM Clean)',
        sampleRate: '16000',
        filter: 'aresample=16000:filter_size=64:phase_shift=10:cutoff=0.96,highpass=f=65,lowpass=f=7600,acompressor=threshold=-16dB:ratio=2.4:attack=10:release=120,alimiter=limit=0.92',
        label: '16 kHz PCM Clean (MLow)'
    },
    clear: {
        key: 'clear',
        name: 'Clear HD (24k Master → MLow Jernih)',
        sampleRate: '16000',
        filter: 'aresample=48000,highpass=f=75,equalizer=f=240:t=q:w=1.2:g=-2,equalizer=f=2800:t=q:w=1.2:g=3.5,equalizer=f=5400:t=q:w=1.4:g=2.5,lowpass=f=7750,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=16000:filter_size=64:phase_shift=10:cutoff=0.97:dither_method=triangular',
        label: 'MLow Clear HD (PCM Lossless)'
    },
    bass: {
        key: 'bass',
        name: 'Warm Bass (Bass Boost + Jernih)',
        sampleRate: '16000',
        filter: 'aresample=48000,highpass=f=55,equalizer=f=125:t=q:w=1.1:g=4.0,equalizer=f=2900:t=q:w=1.2:g=2.2,lowpass=f=7650,acompressor=threshold=-15dB:ratio=2.5:attack=10:release=110,alimiter=limit=0.90,aresample=16000:filter_size=64:phase_shift=10:cutoff=0.97:dither_method=triangular',
        label: 'MLow Warm Bass (PCM Lossless)'
    },
    studio: {
        key: 'studio',
        name: 'Studio 48 kHz (PCM Ultra Master)',
        sampleRate: '48000',
        filter: 'aresample=48000:filter_size=64,highpass=f=65,equalizer=f=2600:t=q:w=1.2:g=2.8,equalizer=f=5600:t=q:w=1.4:g=2.0,loudnorm=I=-15:TP=-1.2:LRA=10,alimiter=limit=0.93',
        label: '48 kHz Studio PCM → MLow'
    }
};

const QUALITY_ALIASES = {
    '360': '360p', '360p': '360p', sd: '360p', ringan: '360p',
    '480': '480p', '480p': '480p', med: '480p', medium: '480p',
    '720': '720p', '720p': '720p', high: '720p'
};

const AUDIO_QUALITY_ALIASES = {
    low: 'low', hemat: 'low', '8k': 'low', '8khz': 'low',
    normal: 'normal', standard: 'normal', standar: 'normal', '16k': 'normal', '16khz': 'normal',
    clear: 'clear', hd: 'clear', jernih: 'clear', bening: 'clear', vokal: 'clear', '24k': 'clear', '24khz': 'clear', '32k': 'clear',
    bass: 'bass', warm: 'bass', bassboost: 'bass',
    studio: 'studio', ultra: 'studio', max: 'studio', '48k': 'studio', '48khz': 'studio', hifi: 'studio'
};

function resolveQualityPreset(input, fallbackKey = DEFAULT_CALL_QUALITY) {
    const clean = String(input || '').trim().toLowerCase();
    const mapped = QUALITY_ALIASES[clean];
    if (mapped && CALL_QUALITY_PRESETS[mapped]) return CALL_QUALITY_PRESETS[mapped];
    if (clean === 'low' || clean === 'hemat') return CALL_QUALITY_PRESETS['360p'];
    if (clean === 'normal' || clean === 'standard' || clean === 'default') return CALL_QUALITY_PRESETS['480p'];
    if (clean === 'hd' || clean === 'max' || clean === 'ultra') return CALL_QUALITY_PRESETS['720p'];
    const fb = QUALITY_ALIASES[String(fallbackKey || '').trim().toLowerCase()] || DEFAULT_CALL_QUALITY;
    return CALL_QUALITY_PRESETS[fb] || CALL_QUALITY_PRESETS['480p'];
}

function resolveAudioQualityPreset(input, fallbackKey = DEFAULT_AUDIO_QUALITY) {
    const clean = String(input || '').trim().toLowerCase();
    const mapped = AUDIO_QUALITY_ALIASES[clean];
    if (mapped && CALL_AUDIO_PRESETS[mapped]) return CALL_AUDIO_PRESETS[mapped];
    const fb = AUDIO_QUALITY_ALIASES[String(fallbackKey || '').trim().toLowerCase()] || DEFAULT_AUDIO_QUALITY;
    return CALL_AUDIO_PRESETS[fb] || CALL_AUDIO_PRESETS.clear;
}

function isQualityToken(token) {
    const clean = String(token || '').trim().toLowerCase();
    return Boolean(clean && (QUALITY_ALIASES[clean] || ['low', 'hemat', 'normal', 'standard', 'hd', 'ultra', 'max'].includes(clean)));
}

function isVideoQualityToken(token) {
    const clean = String(token || '').trim().toLowerCase();
    return Boolean(clean && QUALITY_ALIASES[clean]);
}

function isAudioQualityToken(token) {
    const clean = String(token || '').trim().toLowerCase();
    return Boolean(clean && AUDIO_QUALITY_ALIASES[clean]);
}

function supportsGroupCall(health) {
    if (!health) return false;
    if (String(health.version || '') >= REQUIRED_GROUP_BRIDGE_VERSION) return true;
    return false;
}

let bridgeProc = null;
let bridgeStartingPromise = null;
let buildInProgress = false;
let shutdownWired = false;
let lastBridgeLogs = [];

let callDispatchChain = Promise.resolve();
let preparingPrimaryCount = 0;
let queueWatcherTimer = null;
let lastAnnouncedTrackKey = '';

function isCallLaunching() {
    return preparingPrimaryCount > 0;
}

function claimPrimarySlot() {
    if (preparingPrimaryCount > 0) return false;
    preparingPrimaryCount++;
    return true;
}

function releasePrimarySlot() {
    if (preparingPrimaryCount > 0) preparingPrimaryCount--;
}

function runSerializedCallOp(fn) {
    const next = callDispatchChain.then(fn, fn);
    callDispatchChain = next.catch(() => {});
    return next;
}

function pushBridgeLog(line) {
    const clean = String(line || '').trim();
    if (!clean) return;
    lastBridgeLogs.push(clean);
    if (lastBridgeLogs.length > 40) lastBridgeLogs.shift();
}

function getRecentLogs(limit = 10) {
    return lastBridgeLogs.slice(-limit);
}

function ensureDirs() {
    for (const dir of [CALL_TMP_DIR, path.dirname(CALL_DB_PATH), path.dirname(BIN_PATH)]) {
        try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        } catch (_) {}
    }
}

function getFfmpegBinary() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
        return process.env.FFMPEG_PATH;
    }
    try {
        const ff = require('@ffmpeg-installer/ffmpeg');
        if (ff && ff.path && fs.existsSync(ff.path)) {
            try { fs.chmodSync(ff.path, 0o755); } catch (_) {}
            return ff.path;
        }
    } catch (_) {}
    return 'ffmpeg';
}

function isBinaryInstalled() {
    try {
        return fs.existsSync(BIN_PATH) && fs.statSync(BIN_PATH).size > 1024;
    } catch (_) {
        return false;
    }
}

function wireShutdownHooks() {
    if (shutdownWired) return;
    shutdownWired = true;
    const stopChild = () => {
        if (bridgeProc && !bridgeProc.killed) {
            try { bridgeProc.kill('SIGTERM'); } catch (_) {}
        }
    };
    process.on('exit', stopChild);
    process.on('SIGINT', stopChild);
    process.on('SIGTERM', stopChild);
}

async function bridgeRequest(method, endpoint, data = null, timeout = 35000) {
    const res = await axios({
        method,
        url: `${CALL_BASE_URL}${endpoint}`,
        data,
        timeout,
        headers: {
            'Content-Type': 'application/json',
            'X-Call-Token': CALL_TOKEN
        },
        validateStatus: () => true
    });
    const body = res.data && typeof res.data === 'object' ? res.data : { ok: false, error: String(res.data || 'invalid response') };
    if (res.status >= 400 || body.ok === false) {
        const err = new Error(body.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

async function pingBridge() {
    try {
        return await bridgeRequest('GET', '/health', null, 2500);
    } catch (_) {
        return null;
    }
}

async function ensureRunning() {
    const alive = await pingBridge();
    if (alive) return alive;

    if (!isBinaryInstalled()) {
        const err = new Error('Engine MeowCaller belum terpasang. Owner silakan ketik .callsetup untuk build otomatis (tanpa root).');
        err.code = 'NOT_INSTALLED';
        throw err;
    }

    if (bridgeStartingPromise) {
        return bridgeStartingPromise;
    }

    ensureDirs();
    wireShutdownHooks();

    bridgeStartingPromise = (async () => {
        try {
            try { fs.chmodSync(BIN_PATH, 0o755); } catch (_) {}

            bridgeProc = spawn(BIN_PATH, [], {
                cwd: ROOT_DIR,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    CALL_BRIDGE_PORT: String(CALL_PORT),
                    CALL_BRIDGE_DB: CALL_DB_PATH,
                    CALL_BRIDGE_TOKEN: CALL_TOKEN
                }
            });

            bridgeProc.stdout?.on('data', (chunk) => {
                String(chunk).split(/\r?\n/).forEach(pushBridgeLog);
            });
            bridgeProc.stderr?.on('data', (chunk) => {
                String(chunk).split(/\r?\n/).forEach(pushBridgeLog);
            });
            bridgeProc.on('exit', (code, sig) => {
                pushBridgeLog(`[Bridge] exited code=${code} sig=${sig}`);
                bridgeProc = null;
            });

            const deadline = Date.now() + 12000;
            while (Date.now() < deadline) {
                const health = await pingBridge();
                if (health) return health;
                if (!bridgeProc) break;
                await new Promise((r) => setTimeout(r, 350));
            }

            const recent = getRecentLogs(4).join(' | ');
            throw new Error(`MeowCaller Bridge gagal start${recent ? `: ${recent}` : ''}`);
        } finally {
            bridgeStartingPromise = null;
        }
    })();

    return bridgeStartingPromise;
}

function stopBridgeProcess() {
    if (bridgeProc && !bridgeProc.killed) {
        try { bridgeProc.kill('SIGTERM'); } catch (_) {}
        bridgeProc = null;
    }
}

async function buildBridge() {
    if (buildInProgress) {
        throw new Error('Proses build MeowCaller Bridge sedang berjalan. Mohon tunggu selesai.');
    }
    if (!fs.existsSync(SETUP_SCRIPT)) {
        throw new Error('Script scripts/setup-caller.sh tidak ditemukan.');
    }

    buildInProgress = true;
    stopBridgeProcess();
    const logs = [];

    try {
        try { fs.chmodSync(SETUP_SCRIPT, 0o755); } catch (_) {}

        await new Promise((resolve, reject) => {
            const child = spawn('bash', [SETUP_SCRIPT], {
                cwd: ROOT_DIR,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    TMPDIR: path.join(ROOT_DIR, 'tmp', 'gotmp'),
                    GOTMPDIR: path.join(ROOT_DIR, 'tmp', 'gotmp')
                }
            });

            const timer = setTimeout(() => {
                try { child.kill('SIGKILL'); } catch (_) {}
                reject(new Error('Build timeout (> 7 menit). Coba jalankan bash scripts/setup-caller.sh dari terminal server.'));
            }, 7 * 60 * 1000);

            const collect = (chunk) => {
                const lines = String(chunk).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
                for (const l of lines) {
                    logs.push(l);
                    pushBridgeLog(l);
                    if (logs.length > 60) logs.shift();
                }
            };

            child.stdout?.on('data', collect);
            child.stderr?.on('data', collect);
            child.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
            child.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0 && isBinaryInstalled()) {
                    resolve();
                } else {
                    const tail = logs.slice(-6).join('\n');
                    reject(new Error(`Build gagal (exit ${code}).\n${tail}`));
                }
            });
        });

        const health = await ensureRunning();
        return { ok: true, binPath: BIN_PATH, health, logs: logs.slice(-8) };
    } finally {
        buildInProgress = false;
    }
}

function runFfmpeg(args, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
        const ffmpegBin = getFfmpegBinary();
        const child = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';

        const timer = setTimeout(() => {
            try { child.kill('SIGKILL'); } catch (_) {}
            reject(new Error('FFmpeg transcode timeout'));
        }, timeoutMs);

        child.stderr?.on('data', (d) => {
            stderr += String(d);
            if (stderr.length > 6000) stderr = stderr.slice(-6000);
        });
        child.on('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`FFmpeg tidak dapat dijalankan (${ffmpegBin}): ${err.message}`));
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) return resolve();
            const tail = stderr.trim().split(/\r?\n/).slice(-5).join('\n');
            reject(new Error(`FFmpeg gagal (code ${code}): ${tail}`));
        });
    });
}

function cleanupPaths(paths) {
    for (const p of paths || []) {
        if (!p) continue;
        try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (_) {}
    }
}

async function ensureAudioTrackExists(audioPath) {
    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 256) {
        return audioPath;
    }
    await runFfmpeg([
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono',
        '-t', '5',
        '-ac', '1', '-ar', '16000',
        '-c:a', 'pcm_s16le',
        audioPath
    ], 30000);
    return audioPath;
}

async function encodeCallAudioWav(rawPath, audioPath, audioPreset) {
    const primaryArgs = [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-t', String(MAX_CALL_DURATION_SEC),
        '-i', rawPath,
        '-vn', '-ac', '1',
        '-af', audioPreset.filter,
        '-ar', audioPreset.sampleRate,
        '-c:a', 'pcm_s16le',
        audioPath
    ];
    try {
        await runFfmpeg(primaryArgs, 150000);
    } catch (_) {
        await runFfmpeg([
            '-y', '-hide_banner', '-loglevel', 'error',
            '-t', String(MAX_CALL_DURATION_SEC),
            '-i', rawPath,
            '-vn', '-ac', '1', '-ar', '16000',
            '-c:a', 'pcm_s16le',
            audioPath
        ], 120000);
    }
}

async function prepareCallMedia({
    mode = 'video',
    query = '',
    inputBuffer = null,
    inputExt = 'mp4',
    quality = DEFAULT_CALL_QUALITY,
    audioQuality = DEFAULT_AUDIO_QUALITY,
    fps = null
}) {
    ensureDirs();
    const isVideo = mode === 'video';
    const preset = resolveQualityPreset(quality, DEFAULT_CALL_QUALITY);
    const audioPreset = resolveAudioQualityPreset(audioQuality, DEFAULT_AUDIO_QUALITY);
    const activeFps = (fps && Number(fps) > 0) ? Number(fps) : preset.fps;
    const jobId = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const rawPath = path.join(CALL_TMP_DIR, `${jobId}_src.${inputExt || (isVideo ? 'mp4' : 'mp3')}`);
    const h264Path = path.join(CALL_TMP_DIR, `${jobId}.h264`);
    const audioPath = path.join(CALL_TMP_DIR, `${jobId}.wav`);

    let meta = {
        title: query || (isVideo ? 'Video Call Stream' : 'Audio Call Stream'),
        artist: '-',
        duration: '-',
        url: '',
        quality: preset.key,
        audioQuality: audioPreset.key,
        resolution: isVideo ? `${preset.videoLabel} • ${audioPreset.label}` : audioPreset.label
    };

    try {
        if (Buffer.isBuffer(inputBuffer) && inputBuffer.length > 0) {
            fs.writeFileSync(rawPath, inputBuffer);
        } else {
            if (!query || !String(query).trim()) {
                throw new Error('Masukkan judul / link YouTube, atau reply media video/audio.');
            }
            if (isVideo) {
                let yt = null;
                let lastYtErr = null;
                const qualitiesToTry = [...new Set([preset.ytRes, '480', '360'])];
                for (const qTry of qualitiesToTry) {
                    try {
                        yt = await youtubeService.downloadYtMp4ToFile(query, `${qTry}p`, rawPath, {
                            maxDurationSec: MAX_CALL_DURATION_SEC,
                            explicitQuality: true
                        });
                        if (yt && fs.existsSync(rawPath) && fs.statSync(rawPath).size >= 16384) {
                            break;
                        }
                    } catch (e) {
                        lastYtErr = e;
                    }
                }
                if (!yt || !fs.existsSync(rawPath) || fs.statSync(rawPath).size < 16384) {
                    throw new Error(lastYtErr?.message || 'Gagal mengunduh video dari YouTube.');
                }
                meta = {
                    title: yt.title || query,
                    artist: yt.author || yt.artist || '-',
                    duration: yt.duration || '-',
                    url: yt.url || '',
                    quality: preset.key,
                    audioQuality: audioPreset.key,
                    resolution: `${preset.videoLabel} • ${audioPreset.label}`
                };
            } else {
                const yt = await youtubeService.downloadYtMp3(query, true, {
                    maxDurationSec: MAX_CALL_DURATION_SEC
                });
                if (!yt || (!Buffer.isBuffer(yt.buffer) && !yt.filePath)) {
                    throw new Error('Gagal mengunduh audio dari YouTube.');
                }
                if (Buffer.isBuffer(yt.buffer) && yt.buffer.length >= 2048) {
                    fs.writeFileSync(rawPath, yt.buffer);
                } else if (yt.filePath && fs.existsSync(yt.filePath)) {
                    fs.renameSync(yt.filePath, rawPath);
                } else {
                    throw new Error('File audio hasil unduhan terlalu kecil.');
                }
                meta = {
                    title: yt.title || query,
                    artist: yt.artist || '-',
                    duration: yt.duration || '-',
                    url: yt.url || '',
                    quality: preset.key,
                    audioQuality: audioPreset.key,
                    resolution: audioPreset.label
                };
            }
        }

        if (isVideo) {
            const keyint = String(activeFps);
            const h264Level = preset.key === '720p' ? '3.2' : '3.1';
            await runFfmpeg([
                '-y', '-hide_banner', '-loglevel', 'error',
                '-t', String(MAX_CALL_DURATION_SEC),
                '-i', rawPath,
                '-map', '0:v:0',
                '-an',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-tune', 'zerolatency',
                '-profile:v', 'baseline',
                '-level', h264Level,
                '-pix_fmt', 'yuv420p',
                '-r', keyint,
                '-vf', `${preset.scale},setsar=1`,
                '-g', keyint,
                '-keyint_min', keyint,
                '-sc_threshold', '0',
                '-x264-params', 'repeat-headers=1:bframes=0:cabac=0:open-gop=0:sliced-threads=0:slices=1:aud=0',
                '-b:v', preset.bitrate, '-maxrate', preset.maxrate, '-bufsize', preset.bufsize,
                '-threads', '0',
                '-f', 'h264', h264Path
            ], 240000);

            if (!fs.existsSync(h264Path) || fs.statSync(h264Path).size < 256) {
                throw new Error('Hasil encode H.264 kosong. Pastikan file berisi video yang valid.');
            }
            try {
                await encodeCallAudioWav(rawPath, audioPath, audioPreset);
            } catch (_) {}
            await ensureAudioTrackExists(audioPath);
        } else {
            await encodeCallAudioWav(rawPath, audioPath, audioPreset);
            if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size < 256) {
                throw new Error('Hasil encode audio PCM WAV kosong.');
            }
        }

        cleanupPaths([rawPath]);
        return {
            mode,
            h264Path: isVideo ? h264Path : '',
            audioPath,
            fps: activeFps,
            quality: preset.key,
            audioQuality: audioPreset.key,
            meta
        };
    } catch (err) {
        cleanupPaths([rawPath, h264Path, audioPath]);
        throw err;
    }
}

async function createBaileysCallLink(sock, media = 'video') {
    const cleanMedia = String(media || 'video').toLowerCase() === 'audio' ? 'audio' : 'video';
    if (!sock || typeof sock.query !== 'function') {
        throw new Error('Socket Baileys tidak mendukung query stanza.');
    }

    const { getBinaryNodeChild } = require('@whiskeysockets/baileys');

    if (typeof sock.createCallLink === 'function') {
        const token = await sock.createCallLink(cleanMedia);
        if (token) {
            return {
                token,
                media: cleanMedia,
                url: `https://call.whatsapp.com/${cleanMedia === 'video' ? 'video' : 'voice'}/${token}`
            };
        }
    }

    const reqId = (typeof sock.generateMessageTag === 'function' ? sock.generateMessageTag() : null)
        || crypto.randomBytes(8).toString('hex').toUpperCase();

    const extractToken = (node) => {
        if (!node) return '';
        if (node.attrs?.token) return node.attrs.token;
        const linkCreate = getBinaryNodeChild(node, 'link_create');
        if (linkCreate?.attrs?.token) return linkCreate.attrs.token;
        if (Array.isArray(node.content)) {
            for (const c of node.content) {
                const found = extractToken(c);
                if (found) return found;
            }
        }
        return '';
    };

    const stanzas = [
        {
            tag: 'call',
            attrs: { to: '@call', id: reqId },
            content: [{ tag: 'link_create', attrs: { media: cleanMedia } }]
        },
        {
            tag: 'iq',
            attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'w:call', id: `${reqId}B` },
            content: [{ tag: 'link_create', attrs: { media: cleanMedia } }]
        }
    ];

    let lastErr = null;
    for (const stanza of stanzas) {
        try {
            const resp = await sock.query(stanza, 15000);
            const token = extractToken(resp);
            if (token) {
                const pathSeg = cleanMedia === 'video' ? 'video' : 'voice';
                return {
                    token,
                    media: cleanMedia,
                    url: `https://call.whatsapp.com/${pathSeg}/${token}`
                };
            }
        } catch (err) {
            lastErr = err;
        }
    }

    throw lastErr || new Error('Server WhatsApp tidak mengembalikan token call link.');
}

async function getStatus() {
    const installed = isBinaryInstalled();
    const health = await pingBridge();
    return {
        installed,
        running: Boolean(health),
        building: buildInProgress,
        version: health?.version || '1.0.0',
        supportsGroup: supportsGroupCall(health),
        port: CALL_PORT,
        binPath: BIN_PATH,
        loggedIn: Boolean(health?.loggedIn),
        connected: Boolean(health?.connected),
        pairing: Boolean(health?.pairing),
        jid: health?.jid || '',
        activeCalls: Array.isArray(health?.activeCalls) ? health.activeCalls : [],
        recentLogs: getRecentLogs(6)
    };
}

async function requestPair(phone) {
    await ensureRunning();
    return bridgeRequest('POST', '/pair', { phone }, 35000);
}

async function logoutCaller() {
    const health = await pingBridge();
    if (health) {
        return bridgeRequest('POST', '/logout', {}, 15000);
    }
    cleanupPaths([CALL_DB_PATH, `${CALL_DB_PATH}-wal`, `${CALL_DB_PATH}-shm`]);
    return { ok: true, message: 'caller session cleared' };
}

async function stopCalls(callId = '') {
    const health = await pingBridge();
    if (!health) return { ok: true, stopped: 0 };
    return bridgeRequest('POST', '/stop', { callId }, 15000);
}

function normalizeCallLinkUrl(url, mode = 'audio') {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (mode !== 'video') {
        return raw.replace(/call\.whatsapp\.com\/audio\//i, 'call.whatsapp.com/voice/');
    }
    return raw;
}

async function startPlayCall({
    mode = 'video',
    callType = 'link',
    screenShare = true,
    target = '',
    targetLid = '',
    groupJid = '',
    targets = [],
    quality = DEFAULT_CALL_QUALITY,
    requestedBy = '',
    chatJid = '',
    h264Path = '',
    audioPath = '',
    title = '',
    fps = DEFAULT_VIDEO_FPS,
    loop = false,
    autoEndSec = 1800
}) {
    await ensureRunning();
    const res = await bridgeRequest('POST', '/playcall', {
        mode,
        callType,
        screenShare: mode === 'video' ? Boolean(screenShare) : false,
        target,
        targetLid,
        groupJid,
        targets,
        quality,
        requestedBy,
        chatJid,
        h264Path,
        audioPath,
        title,
        fps,
        loop,
        autoEndSec
    }, 55000);
    if (res && res.linkUrl) {
        res.linkUrl = normalizeCallLinkUrl(res.linkUrl, mode);
    }
    if (res && res.callId) {
        lastAnnouncedTrackKey = `${res.callId}:1`;
    }
    return res;
}

async function inviteCallParticipants(targets = [], callId = '') {
    const health = await pingBridge();
    if (!health) throw new Error('Bridge panggilan belum aktif.');
    return bridgeRequest('POST', '/invite', { callId, targets }, 25000);
}

async function enqueueCallTrack({
    callId = '',
    mode = 'audio',
    quality = DEFAULT_AUDIO_QUALITY,
    requestedBy = '',
    chatJid = '',
    h264Path = '',
    audioPath = '',
    title = '',
    fps = DEFAULT_VIDEO_FPS
}) {
    await ensureRunning();
    return bridgeRequest('POST', '/enqueue', {
        callId,
        mode,
        quality,
        requestedBy,
        chatJid,
        h264Path,
        audioPath,
        title,
        fps
    }, 30000);
}

async function skipCallTrack(callId = '') {
    const health = await pingBridge();
    if (!health) return { ok: true, skipped: false, ended: false };
    return bridgeRequest('POST', '/skip', { callId }, 15000);
}

async function clearCallQueue(callId = '') {
    const health = await pingBridge();
    if (!health) return { ok: true, cleared: 0 };
    return bridgeRequest('POST', '/clearqueue', { callId }, 15000);
}

async function getActiveCall() {
    const health = await pingBridge();
    if (!health || !Array.isArray(health.activeCalls) || health.activeCalls.length === 0) return null;
    return health.activeCalls[0];
}

function startQueueWatcher(sock) {
    if (queueWatcherTimer || !sock) return;
    queueWatcherTimer = setInterval(async () => {
        try {
            const active = await getActiveCall();
            if (!active) {
                clearInterval(queueWatcherTimer);
                queueWatcherTimer = null;
                lastAnnouncedTrackKey = '';
                return;
            }
            const key = `${active.callId}:${active.trackSeq || 1}`;
            if (active.trackSeq > 1 && key !== lastAnnouncedTrackKey) {
                lastAnnouncedTrackKey = key;
                const dest = active.chatJid || active.groupJid;
                if (dest) {
                    const reqLine = active.requestedBy ? `\n> ʀᴇǫᴜᴇsᴛ : ${active.requestedBy}` : '';
                    const qRem = Number(active.queueLength || 0);
                    await sock.sendMessage(dest, {
                        text:
                            `▶️ *Memutar Antrean Berikutnya!*\n\n` +
                            `> ᴊᴜᴅᴜʟ : *${active.title || 'Media Stream'}*${reqLine}\n` +
                            `> ᴋᴜᴀʟɪᴛᴀs : \`${active.quality || '-'}\`\n` +
                            `> sɪsᴀ ᴀɴᴛʀᴇᴀɴ : \`${qRem} lagu\``
                    }).catch(() => {});
                }
            }
        } catch (_) {}
    }, 3500);
    if (typeof queueWatcherTimer.unref === 'function') queueWatcherTimer.unref();
}

module.exports = {
    BIN_PATH,
    CALL_PORT,
    DEFAULT_VIDEO_FPS,
    DEFAULT_CALL_QUALITY,
    DEFAULT_AUDIO_QUALITY,
    CALL_QUALITY_PRESETS,
    CALL_AUDIO_PRESETS,
    resolveQualityPreset,
    resolveAudioQualityPreset,
    isQualityToken,
    isVideoQualityToken,
    isAudioQualityToken,
    supportsGroupCall,
    isBinaryInstalled,
    ensureRunning,
    stopBridgeProcess,
    buildBridge,
    getStatus,
    getActiveCall,
    isCallLaunching,
    claimPrimarySlot,
    releasePrimarySlot,
    runSerializedCallOp,
    startQueueWatcher,
    requestPair,
    logoutCaller,
    stopCalls,
    startPlayCall,
    enqueueCallTrack,
    skipCallTrack,
    clearCallQueue,
    inviteCallParticipants,
    prepareCallMedia,
    cleanupPaths,
    createBaileysCallLink
};
