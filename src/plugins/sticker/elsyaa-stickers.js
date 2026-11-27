const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { randomBytes } = require('crypto');
const { writeExifImg, writeExifVid } = require('../../utils/exif');
const { runFfmpegFile } = require('../audio/_helper');

let createCanvas = null, loadImage = null;
try { ({ createCanvas, loadImage } = require('canvas')); } catch (_) {}

function getStickerMeta(Dinz, botCtx) {
    const id = botCtx?.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
    return {
        packname: id.packname || global.packname || 'HuTao - MD',
        author: id.namaOwner || global.namaOwner || 'DinzID'
    };
}

function wrapLines(ctx, text, maxW) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur);
            cur = w;
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);
    return lines;
}

async function sendAsSticker(Dinz, m, imgBuf, meta, isVid = false) {
    const outPath = isVid ? await writeExifVid(imgBuf, meta) : await writeExifImg(imgBuf, meta);
    const stBuf = fs.readFileSync(outPath);
    try { fs.unlinkSync(outPath); } catch (_) {}
    await Dinz.sendMessage(m.chat, { sticker: stBuf }, { quoted: m });
}

function renderTextCanvas(text, { bg = 'transparent', fg = '#FFFFFF', stroke = '#000000', fontSize = 72, align = 'center' } = {}) {
    if (!createCanvas) return null;
    const S = 512;
    const canvas = createCanvas(S, S);
    const ctx = canvas.getContext('2d');
    if (bg !== 'transparent') {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, S, S);
    }
    let size = fontSize;
    let lines = [];
    while (size >= 26) {
        ctx.font = `bold ${size}px sans-serif`;
        lines = wrapLines(ctx, text, S - 56);
        if (lines.length * (size * 1.2) <= S - 56) break;
        size -= 4;
    }
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const lh = size * 1.18;
    const startY = S / 2 - ((lines.length - 1) * lh) / 2;
    const x = align === 'left' ? 32 : S / 2;
    for (let i = 0; i < lines.length; i++) {
        const y = startY + i * lh;
        if (stroke) {
            ctx.lineWidth = Math.max(4, Math.round(size / 8));
            ctx.strokeStyle = stroke;
            ctx.lineJoin = 'round';
            ctx.strokeText(lines[i], x, y);
        }
        ctx.fillStyle = fg;
        ctx.fillText(lines[i], x, y);
    }
    return canvas.toBuffer('image/png');
}

module.exports = {
    name: 'elsyaa-stickers',
    category: 'sticker',
    commands: ['smeme', 'stikermeme', 'ttp', 'attp', 'bratgreen', 'bratijo'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, qmsg, mime, isCreator, Reply, botCtx, checkLimit, addLimit, usedPrefix } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const meta = getStickerMeta(Dinz, botCtx);

        try {
            // 1. SMEME — teks atas | teks bawah di atas gambar/stiker
            if (cmd === 'smeme' || cmd === 'stikermeme') {
                const isMedia = /image|webp/i.test(mime || '') || ['imageMessage', 'stickerMessage'].includes(m.quoted?.type || m.type);
                const cleanText = String(text || '').trim();
                if (!isMedia || !cleanText) {
                    return Reply(`🖼️ Reply/kirim *gambar* dengan teks:\n> \`${pfx}smeme teks atas | teks bawah\`\n> Contoh: \`${pfx}smeme PAS GAJIAN | PAS AKHIR BULAN\``);
                }
                if (!createCanvas || !loadImage) {
                    return Reply('❌ Fitur `smeme` membutuhkan modul `canvas` (tidak tersedia di perangkat ini).');
                }
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                let rawBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                // Jika input webp/sticker, konversi dulu ke png via ffmpeg agar loadImage aman
                if (/webp/i.test(mime || '') || m.quoted?.type === 'stickerMessage') {
                    const tmpDir = path.join(process.cwd(), 'tmp');
                    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                    const uid = `${Date.now()}_${randomBytes(3).toString('hex')}`;
                    const inF = path.join(tmpDir, `sm_in_${uid}.webp`);
                    const outF = path.join(tmpDir, `sm_out_${uid}.png`);
                    try {
                        fs.writeFileSync(inF, rawBuf);
                        await runFfmpegFile(['-y', '-i', inF, outF]);
                        if (fs.existsSync(outF)) rawBuf = fs.readFileSync(outF);
                    } finally {
                        try { if (fs.existsSync(inF)) fs.unlinkSync(inF); } catch (_) {}
                        try { if (fs.existsSync(outF)) fs.unlinkSync(outF); } catch (_) {}
                    }
                }

                const [rawTop, rawBottom] = cleanText.includes('|')
                    ? cleanText.split('|').map((s) => s.trim().toUpperCase())
                    : ['', cleanText.toUpperCase()];

                const img = await loadImage(rawBuf);
                const S = 512;
                const canvas = createCanvas(S, S);
                const c = canvas.getContext('2d');
                const scale = Math.max(S / img.width, S / img.height);
                const dw = img.width * scale;
                const dh = img.height * scale;
                c.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);

                const drawImpact = (str, isTop) => {
                    if (!str) return;
                    let sz = 52;
                    let lines = [];
                    while (sz >= 22) {
                        c.font = `900 ${sz}px sans-serif`;
                        lines = wrapLines(c, str, S - 36);
                        if (lines.length <= 3) break;
                        sz -= 4;
                    }
                    c.textAlign = 'center';
                    c.textBaseline = isTop ? 'top' : 'bottom';
                    c.lineWidth = Math.max(5, Math.round(sz / 6));
                    c.strokeStyle = '#000000';
                    c.fillStyle = '#FFFFFF';
                    c.lineJoin = 'round';
                    const lh = sz * 1.12;
                    lines.forEach((ln, idx) => {
                        const y = isTop ? 16 + idx * lh : S - 16 - (lines.length - 1 - idx) * lh;
                        c.strokeText(ln, S / 2, y);
                        c.fillText(ln, S / 2, y);
                    });
                };
                drawImpact(rawTop, true);
                drawImpact(rawBottom, false);

                await sendAsSticker(Dinz, m, canvas.toBuffer('image/png'), meta, false);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 2. TTP — Text to Sticker (API nexray live-verified + fallback local canvas!)
            if (cmd === 'ttp') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🖼️ Masukkan teks!\n> Contoh: \`${pfx}ttp Halo HuTao\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                let pngBuf = null;
                try {
                    const res = await axios.get(`https://api.nexray.eu.cc/maker/ttp?text=${encodeURIComponent(q)}`, {
                        responseType: 'arraybuffer',
                        timeout: 12000
                    });
                    if (res.status === 200 && res.data?.byteLength > 200) {
                        pngBuf = Buffer.from(res.data);
                    }
                } catch (_) {}

                if (!pngBuf) {
                    pngBuf = renderTextCanvas(q, { bg: 'transparent', fg: '#FFFFFF', stroke: '#111111', fontSize: 78 });
                }
                if (!pngBuf) return Reply('❌ Gagal membuat stiker TTP.');

                await sendAsSticker(Dinz, m, pngBuf, meta, false);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 3. ATTP — Animated Rainbow Text Sticker (100% lokal Canvas + FFmpeg!)
            if (cmd === 'attp') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🌈 Masukkan teks!\n> Contoh: \`${pfx}attp HuTao Keren\``);
                if (!createCanvas) return Reply('❌ Fitur `attp` membutuhkan modul `canvas`.');
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#AF52DE', '#FF2D55'];
                const tmpDir = path.join(process.cwd(), 'tmp', `attp_${Date.now()}_${randomBytes(3).toString('hex')}`);
                fs.mkdirSync(tmpDir, { recursive: true });
                const outMp4 = path.join(tmpDir, 'out.mp4');
                try {
                    for (let i = 0; i < colors.length; i++) {
                        const frame = renderTextCanvas(q, { bg: '#000000', fg: colors[i], stroke: '#FFFFFF', fontSize: 76 });
                        fs.writeFileSync(path.join(tmpDir, `f_${i}.png`), frame);
                    }
                    await runFfmpegFile([
                        '-y', '-framerate', '6',
                        '-i', path.join(tmpDir, 'f_%d.png'),
                        '-vf', 'scale=512:512',
                        '-pix_fmt', 'yuv420p',
                        '-c:v', 'libx264', '-preset', 'ultrafast',
                        outMp4
                    ]);
                    const vidBuf = fs.readFileSync(outMp4);
                    await sendAsSticker(Dinz, m, vidBuf, meta, true);
                    addLimit(m.sender, isCreator);
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                } finally {
                    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
                }
                return true;
            }

            // 4. BRATGREEN — Brat Sticker tema hijau neon Charli XCX (100% lokal!)
            if (cmd === 'bratgreen' || cmd === 'bratijo') {
                const q = String(text || '').trim();
                if (!q) return Reply(`💚 Masukkan teks!\n> Contoh: \`${pfx}bratgreen hutao md\``);
                if (!createCanvas) return Reply('❌ Fitur `bratgreen` membutuhkan modul `canvas`.');
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const pngBuf = renderTextCanvas(q.toLowerCase(), {
                    bg: '#8ACE00',
                    fg: '#000000',
                    stroke: null,
                    fontSize: 82,
                    align: 'left'
                });
                await sendAsSticker(Dinz, m, pngBuf, meta, false);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memproses \`${pfx}${cmd}\`: ${err?.message || err}`);
        }
        return true;
    }
};
