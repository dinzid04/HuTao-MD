const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
let sharp = null;
try { sharp = require('sharp'); } catch (e) {}
const FileType = require('file-type');

let ffmpegBin = 'ffmpeg';
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller && ffmpegInstaller.path) {
      try { fs.chmodSync(ffmpegInstaller.path, 0o755); } catch {}
      ffmpegBin = ffmpegInstaller.path;
      const ffDir = path.dirname(ffmpegInstaller.path);
      if (!String(process.env.PATH || '').includes(ffDir)) {
        process.env.PATH = `${process.env.PATH || ''}:${ffDir}`;
      }
    }
  } catch {}
}

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function isWebpBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

async function stripWebpExif(buffer) {
  try {
    const webp = require('node-webpmux');
    const img = new webp.Image();
    await img.load(buffer);
    if (img.exif) {
      img.exif = null;
      return await img.save(null);
    }
  } catch (e) {}
  return buffer;
}

function ffmpeg(buffer, args = [], ext = '', ext2 = '', inputArgs = []) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmp = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext || 'tmp'}`);
      const out = `${tmp}.${ext2 || 'tmp'}`;
      await fs.promises.writeFile(tmp, buffer);

      let stderrLog = '';
      const proc = spawn(ffmpegBin, [
        '-y',
        ...inputArgs,
        '-i', tmp,
        ...args,
        out
      ]);

      proc.stderr.on('data', (chunk) => {
        stderrLog += chunk.toString();
      });

      proc.on('error', (err) => {
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e) {}
        try { if (fs.existsSync(out)) fs.unlinkSync(out); } catch (e) {}
        reject(err);
      });

      proc.on('close', async (code) => {
        try {
          if (fs.existsSync(tmp)) await fs.promises.unlink(tmp);
          if (code !== 0) {
            if (fs.existsSync(out)) await fs.promises.unlink(out);
            const lastErr = stderrLog.trim().split('\n').slice(-2).join(' ');
            return reject(new Error(`FFmpeg exited with code ${code}${lastErr ? `: ${lastErr}` : ''}`));
          }
          const res = await fs.promises.readFile(out);
          if (fs.existsSync(out)) await fs.promises.unlink(out);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function toAudio(buffer, ext = 'mp3') {
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext, 'mp3');
}

function toPTT(buffer, ext = 'mp3') {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus');
}

async function toImage(buffer) {
  try {
    return await sharp(buffer, { animated: false, page: 0, failOn: 'none' })
      .png()
      .toBuffer();
  } catch (err1) {
    try {
      const cleaned = await stripWebpExif(buffer);
      return await sharp(cleaned, { animated: false, page: 0, failOn: 'none' })
        .png()
        .toBuffer();
    } catch (err2) {
      return await ffmpeg(buffer, [
        '-frames:v', '1',
        '-vcodec', 'png'
      ], 'webp', 'png');
    }
  }
}

async function toGif(buffer) {
  try {
    return await sharp(buffer, { animated: true, failOn: 'none' })
      .gif()
      .toBuffer();
  } catch (err1) {
    const cleaned = await stripWebpExif(buffer);
    return await sharp(cleaned, { animated: true, failOn: 'none' })
      .gif()
      .toBuffer();
  }
}

async function toVideoFromSticker(buffer) {
  let workBuf = buffer;
  let meta;
  try {
    meta = await sharp(workBuf, { animated: true, failOn: 'none' }).metadata();
  } catch (e) {
    workBuf = await stripWebpExif(workBuf);
    meta = await sharp(workBuf, { animated: true, failOn: 'none' }).metadata();
  }

  const isAnimated = meta && meta.pages && meta.pages > 1;

  if (isAnimated) {

    let gifBuffer;
    try {
      gifBuffer = await sharp(workBuf, { animated: true, failOn: 'none' })
        .flatten({ background: { r: 0, g: 0, b: 0 } })
        .gif()
        .toBuffer();
    } catch (e) {
      gifBuffer = await sharp(workBuf, { animated: true, failOn: 'none' })
        .gif()
        .toBuffer();
    }

    return await ffmpeg(
      gifBuffer,
      [
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '24',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,fps=20',
        '-an'
      ],
      'gif',
      'mp4',
      ['-f', 'gif']
    );
  } else {

    const pngBuffer = await sharp(workBuf, { animated: false, page: 0, failOn: 'none' })
      .flatten({ background: { r: 0, g: 0, b: 0 } })
      .png()
      .toBuffer();

    return await ffmpeg(
      pngBuffer,
      [
        '-t', '3',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '24',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15',
        '-an'
      ],
      'png',
      'mp4',
      ['-loop', '1']
    );
  }
}

async function toVideo(buffer, ext = 'mp4') {
  if (isWebpBuffer(buffer) || ext === 'webp') {
    return await toVideoFromSticker(buffer);
  }

  let detectedMime = '';
  try {
    const ft = await FileType.fromBuffer(buffer);
    if (ft) {
      detectedMime = ft.mime || '';
      if (!ext || ext === 'mp4') ext = ft.ext || ext;
    }
  } catch (e) {}

  if (detectedMime === 'image/webp') {
    return await toVideoFromSticker(buffer);
  }

  if (detectedMime.startsWith('audio/') || ['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac'].includes(ext)) {
    return await ffmpeg(
      buffer,
      [
        '-shortest',
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '26',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart'
      ],
      ext || 'mp3',
      'mp4',
      ['-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=25']
    );
  }

  return await ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '26',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-movflags', '+faststart'
  ], ext || 'mp4', 'mp4');
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  toImage,
  toVideoFromSticker,
  toGif,
  ffmpeg,
};
