const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { spawn, execSync } = require('child_process');

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

function runFfmpegFile(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(stderr.slice(-300).trim() || `ffmpeg exited with code ${code}`));
            }
            resolve();
        });
    });
}

async function downloadAudioOrVideo(ctx) {
    const { Dinz, m, quoted, mime, qmsg } = ctx;
    const isAudio = /audio/i.test(mime) || m.type === 'audioMessage' || (m.quoted && m.quoted.type === 'audioMessage');
    const isVideo = /video/i.test(mime) || m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage');
    if (!isAudio && !isVideo) return null;

    let buf = null;
    if (typeof qmsg?.download === 'function') buf = await qmsg.download();
    else if (typeof quoted?.download === 'function') buf = await quoted.download();
    else if (typeof m?.download === 'function') buf = await m.download();
    else buf = await Dinz.downloadMediaMessage(quoted || m);

    if (!buf || !buf.length) throw new Error('Gagal mengunduh media audio/video.');
    const isPtt = Boolean(isAudio && (qmsg?.ptt || quoted?.msg?.ptt));
    return { buffer: buf, isVideo, isAudio, isPtt };
}

async function processAudioFilter(ctx, { effectName, filter, extraInputArgs = [], extraOutputArgs = [] }) {
    const { Dinz, m, isCreator, Reply, checkLimit, addLimit, usedPrefix, command } = ctx;

    if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

    let media;
    try {
        media = await downloadAudioOrVideo(ctx);
    } catch (err) {
        return Reply(`❌ ${err.message}`);
    }
    if (!media) {
        return Reply(`\`⌜ ${effectName} ⌟\`\n> ◦ *Cara pakai :* Reply audio / VN / video lalu ketik \`${usedPrefix}${command}\``);
    }

    await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const uid = `${Date.now()}_${randomBytes(4).toString('hex')}`;
    const inFile = path.join(tmpDir, `afx_in_${uid}.${media.isVideo ? 'mp4' : 'audio'}`);
    const outFile = path.join(tmpDir, `afx_out_${uid}.${media.isPtt ? 'ogg' : 'mp3'}`);

    try {
        fs.writeFileSync(inFile, media.buffer);
        const args = ['-y', ...extraInputArgs, '-i', inFile, '-vn'];
        if (filter) args.push('-af', filter);
        if (media.isPtt) {
            args.push('-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', ...extraOutputArgs, outFile);
        } else {
            args.push('-c:a', 'libmp3lame', '-b:a', '192k', ...extraOutputArgs, outFile);
        }

        await runFfmpegFile(args);
        if (!fs.existsSync(outFile)) throw new Error('File hasil audio tidak terbentuk.');
        const outBuf = fs.readFileSync(outFile);

        await Dinz.sendMessage(
            m.chat,
            media.isPtt
                ? { audio: outBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true }
                : { audio: outBuf, mimetype: 'audio/mpeg', ptt: false, fileName: `${effectName.replace(/\s+/g, '_')}.mp3` },
            { quoted: m }
        );

        addLimit(m.sender, isCreator);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
    } catch (err) {
        await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
        return Reply(`❌ Gagal memproses efek *${effectName}*: ${err.message}`);
    } finally {
        try { if (fs.existsSync(inFile)) fs.unlinkSync(inFile); } catch (_) {}
        try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch (_) {}
    }
    return true;
}

function parseTimestampSec(raw) {
    const clean = String(raw || '').trim();
    if (!clean) return NaN;
    if (/^\d+(\.\d+)?$/.test(clean)) return parseFloat(clean);
    const parts = clean.split(':').map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return NaN;
}

function formatTimestamp(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

module.exports = {
    FFMPEG_BIN,
    runFfmpegFile,
    downloadAudioOrVideo,
    processAudioFilter,
    parseTimestampSec,
    formatTimestamp
};
