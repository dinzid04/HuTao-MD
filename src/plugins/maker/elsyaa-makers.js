const axios = require('axios');
const moment = require('moment-timezone');

let createCanvas = null, loadImage = null;
try { ({ createCanvas, loadImage } = require('canvas')); } catch (_) {}
let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.closePath();
}

function wrapText(ctx, text, maxW) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const out = [];
    let cur = '';
    for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(t).width > maxW && cur) {
            out.push(cur);
            cur = w;
        } else {
            cur = t;
        }
    }
    if (cur) out.push(cur);
    return out;
}

async function getInputImageBuffer(ctx) {
    const { Dinz, m, quoted, qmsg, mime } = ctx;
    const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
    if (!isImg) return null;
    if (typeof qmsg?.download === 'function') return qmsg.download();
    if (typeof quoted?.download === 'function') return quoted.download();
    return Dinz.downloadMediaMessage(quoted || m);
}

async function getAvatarBuffer(Dinz, jid) {
    try {
        const url = await Dinz.profilePictureUrl(jid, 'image');
        if (!url) return null;
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch (_) {
        return null;
    }
}

module.exports = {
    name: 'elsyaa-makers',
    category: 'maker',
    commands: ['musiccard', 'mcard', 'fakespotify', 'topixel', 'darkness', 'kalender', 'fakefbkomen'],

    async execute(ctx) {
        const { Dinz, m, command, text, args, isCreator, Reply, checkLimit, addLimit, usedPrefix, uploadUniversalTourl } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        try {
            // 1. MUSICCARD / FAKESPOTIFY — Kartu Musik HD (nexray live + fallback lokal Canvas!)
            if (cmd === 'musiccard' || cmd === 'mcard' || cmd === 'fakespotify') {
                const raw = String(text || '').trim();
                if (!raw) {
                    return Reply(`🎵 Reply/kirim foto lalu ketik:\n> \`${pfx}${cmd} Judul Lagu | Nama Artis\`\n> Contoh: \`${pfx}${cmd} Rewrite The Stars | James Arthur\``);
                }
                const [judulRaw, artisRaw] = raw.split('|');
                const judul = (judulRaw || 'Untitled').trim();
                const artis = (artisRaw || m.pushName || 'Unknown Artist').trim();

                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                let coverBuf = await getInputImageBuffer(ctx);
                if (!coverBuf) coverBuf = await getAvatarBuffer(Dinz, m.sender);

                // Coba API nexray live-verified dulu jika ada uploader
                if (cmd !== 'fakespotify' && coverBuf && typeof uploadUniversalTourl === 'function') {
                    try {
                        const up = await uploadUniversalTourl(coverBuf, 'cover.jpg');
                        const imgUrl = typeof up === 'string' ? up : up?.url;
                        if (imgUrl) {
                            const apiRes = await axios.get(
                                `https://api.nexray.eu.cc/canvas/musiccard?judul=${encodeURIComponent(judul)}&nama=${encodeURIComponent(artis)}&image_url=${encodeURIComponent(imgUrl)}`,
                                { responseType: 'arraybuffer', timeout: 15000 }
                            );
                            if (apiRes.status === 200 && apiRes.data?.byteLength > 2000) {
                                await Dinz.sendMessage(m.chat, { image: Buffer.from(apiRes.data), caption: `🎵 *${judul}* — ${artis}` }, { quoted: m });
                                addLimit(m.sender, isCreator);
                                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                                return true;
                            }
                        }
                    } catch (_) {}
                }

                // Fallback 100% lokal Spotify-style Now Playing Canvas
                if (!createCanvas) return Reply('❌ Modul `canvas` tidak tersedia di perangkat ini.');
                const W = 900, H = 360;
                const canvas = createCanvas(W, H);
                const c = canvas.getContext('2d');
                const grad = c.createLinearGradient(0, 0, W, H);
                grad.addColorStop(0, '#0F172A');
                grad.addColorStop(0.55, '#1E1B4B');
                grad.addColorStop(1, '#111827');
                c.fillStyle = grad;
                c.fillRect(0, 0, W, H);

                drawRoundRect(c, 28, 28, W - 56, H - 56, 28);
                c.fillStyle = 'rgba(255,255,255,0.06)';
                c.fill();

                if (coverBuf && loadImage) {
                    try {
                        const img = await loadImage(coverBuf);
                        c.save();
                        drawRoundRect(c, 58, 60, 240, 240, 22);
                        c.clip();
                        c.drawImage(img, 58, 60, 240, 240);
                        c.restore();
                    } catch (_) {}
                } else {
                    drawRoundRect(c, 58, 60, 240, 240, 22);
                    c.fillStyle = '#1DB954';
                    c.fill();
                }

                c.fillStyle = '#1DB954';
                c.font = 'bold 20px sans-serif';
                c.fillText('NOW PLAYING', 332, 96);

                c.fillStyle = '#FFFFFF';
                c.font = 'bold 40px sans-serif';
                c.fillText(judul.slice(0, 24), 332, 152);

                c.fillStyle = '#CBD5E1';
                c.font = '26px sans-serif';
                c.fillText(artis.slice(0, 32), 332, 196);

                // Progress bar
                drawRoundRect(c, 332, 242, 500, 10, 5);
                c.fillStyle = 'rgba(255,255,255,0.22)';
                c.fill();
                drawRoundRect(c, 332, 242, 310, 10, 5);
                c.fillStyle = '#1DB954';
                c.fill();

                c.fillStyle = '#94A3B8';
                c.font = '18px sans-serif';
                c.fillText('02:14', 332, 280);
                c.textAlign = 'right';
                c.fillText('03:45', 832, 280);

                await Dinz.sendMessage(m.chat, { image: canvas.toBuffer('image/png'), caption: `🎵 *${judul}* — ${artis}` }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 2. TOPIXEL — Efek Pixel Art lokal
            if (cmd === 'topixel') {
                const imgBuf = await getInputImageBuffer(ctx);
                if (!imgBuf) return Reply(`🟦 Reply/kirim foto lalu ketik \`${pfx}topixel [ukuran 8-32]\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const block = Math.max(6, Math.min(40, parseInt(args[0], 10) || 16));

                let outBuf = null;
                if (sharp) {
                    const meta = await sharp(imgBuf).metadata();
                    const w = meta.width || 512;
                    const h = meta.height || 512;
                    const sw = Math.max(16, Math.round(w / block));
                    const sh = Math.max(16, Math.round(h / block));
                    const tiny = await sharp(imgBuf).resize(sw, sh, { kernel: 'nearest' }).toBuffer();
                    outBuf = await sharp(tiny).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
                } else if (createCanvas && loadImage) {
                    const img = await loadImage(imgBuf);
                    const c = createCanvas(img.width, img.height);
                    const g = c.getContext('2d');
                    g.imageSmoothingEnabled = false;
                    const sw = Math.max(16, Math.round(img.width / block));
                    const sh = Math.max(16, Math.round(img.height / block));
                    const t = createCanvas(sw, sh);
                    t.getContext('2d').drawImage(img, 0, 0, sw, sh);
                    g.drawImage(t, 0, 0, sw, sh, 0, 0, img.width, img.height);
                    outBuf = c.toBuffer('image/png');
                }
                if (!outBuf) return Reply('❌ Fitur `topixel` memerlukan `sharp` atau `canvas`.');

                await Dinz.sendMessage(m.chat, { image: outBuf, caption: `🟦 *Pixel Art* (block ${block}px)` }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 3. DARKNESS — Efek Gelap / Moody
            if (cmd === 'darkness') {
                const imgBuf = await getInputImageBuffer(ctx);
                if (!imgBuf) return Reply(`🌑 Reply/kirim foto lalu ketik \`${pfx}darkness [10-90]\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const level = Math.max(10, Math.min(90, parseInt(args[0], 10) || 55));

                let outBuf = null;
                if (sharp) {
                    outBuf = await sharp(imgBuf).modulate({ brightness: 1 - level / 100 }).jpeg({ quality: 90 }).toBuffer();
                } else if (createCanvas && loadImage) {
                    const img = await loadImage(imgBuf);
                    const c = createCanvas(img.width, img.height);
                    const g = c.getContext('2d');
                    g.drawImage(img, 0, 0);
                    g.fillStyle = `rgba(0,0,0,${(level / 100).toFixed(2)})`;
                    g.fillRect(0, 0, img.width, img.height);
                    outBuf = c.toBuffer('image/jpeg');
                }
                if (!outBuf) return Reply('❌ Fitur `darkness` memerlukan `sharp` atau `canvas`.');

                await Dinz.sendMessage(m.chat, { image: outBuf, caption: `🌑 *Darkness* (${level}%)` }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 4. KALENDER — Kalender Visual Bulanan HD (Canvas + fallback teks)
            if (cmd === 'kalender') {
                const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
                const now = moment().tz(tz);
                const month = Math.max(1, Math.min(12, parseInt(args[0], 10) || (now.month() + 1)));
                const year = Math.max(1970, Math.min(2100, parseInt(args[1], 10) || now.year()));
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const daysInMonth = new Date(year, month, 0).getDate();
                const firstDay = new Date(year, month - 1, 1).getDay();
                const isTodayMonth = now.year() === year && (now.month() + 1) === month;
                const todayDate = now.date();

                if (createCanvas) {
                    const W = 760, H = 620;
                    const canvas = createCanvas(W, H);
                    const c = canvas.getContext('2d');
                    const grad = c.createLinearGradient(0, 0, W, H);
                    grad.addColorStop(0, '#0F172A');
                    grad.addColorStop(1, '#1E293B');
                    c.fillStyle = grad;
                    c.fillRect(0, 0, W, H);

                    c.fillStyle = '#F8FAFC';
                    c.font = 'bold 42px sans-serif';
                    c.textAlign = 'center';
                    c.fillText(`${monthNames[month - 1].toUpperCase()} ${year}`, W / 2, 76);

                    const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
                    const colW = (W - 80) / 7;
                    c.font = 'bold 22px sans-serif';
                    dayNames.forEach((dn, idx) => {
                        c.fillStyle = idx === 0 ? '#FB7185' : '#94A3B8';
                        c.fillText(dn, 40 + colW * idx + colW / 2, 138);
                    });

                    let row = 0, col = firstDay;
                    for (let d = 1; d <= daysInMonth; d++) {
                        const cx = 40 + colW * col + colW / 2;
                        const cy = 205 + row * 68;
                        if (isTodayMonth && d === todayDate) {
                            c.beginPath();
                            c.arc(cx, cy - 8, 24, 0, Math.PI * 2);
                            c.fillStyle = '#F43F5E';
                            c.fill();
                            c.fillStyle = '#FFFFFF';
                        } else {
                            c.fillStyle = col === 0 ? '#FB7185' : '#E2E8F0';
                        }
                        c.font = 'bold 26px sans-serif';
                        c.fillText(String(d), cx, cy);
                        col++;
                        if (col > 6) { col = 0; row++; }
                    }

                    await Dinz.sendMessage(m.chat, { image: canvas.toBuffer('image/png'), caption: `📅 *Kalender ${monthNames[month - 1]} ${year}*` }, { quoted: m });
                } else {
                    let grid = 'Min Sen Sel Rab Kam Jum Sab\n' + '    '.repeat(firstDay);
                    let col = firstDay;
                    for (let d = 1; d <= daysInMonth; d++) {
                        grid += String(d).padStart(3, ' ') + ' ';
                        col++;
                        if (col > 6) { col = 0; grid += '\n'; }
                    }
                    await Reply(`📅 *Kalender ${monthNames[month - 1]} ${year}*\n\`\`\`\n${grid.trimEnd()}\n\`\`\``);
                }
                addLimit(m.sender, isCreator);
                return true;
            }

            // 5. FAKEFBKOMEN — Komentar Facebook Palsu (100% lokal Canvas!)
            if (cmd === 'fakefbkomen') {
                const raw = String(text || '').trim();
                if (!raw) return Reply(`💬 Format: \`${pfx}fakefbkomen Nama | Isi Komentar\` *(opsional reply foto profil)*`);
                if (!createCanvas) return Reply('❌ Fitur `fakefbkomen` membutuhkan modul `canvas`.');

                const parts = raw.split('|');
                const author = (parts.length >= 2 ? parts[0] : (m.pushName || 'User')).trim();
                const comment = (parts.length >= 2 ? parts.slice(1).join('|') : parts[0]).trim();

                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                let avBuf = await getInputImageBuffer(ctx);
                if (!avBuf) avBuf = await getAvatarBuffer(Dinz, m.quoted?.sender || m.sender);

                const W = 820;
                const tmp = createCanvas(W, 200).getContext('2d');
                tmp.font = '26px sans-serif';
                const lines = wrapText(tmp, comment, 620).slice(0, 6);
                const bubbleH = Math.max(96, 62 + lines.length * 34);
                const H = bubbleH + 92;

                const canvas = createCanvas(W, H);
                const c = canvas.getContext('2d');
                c.fillStyle = '#FFFFFF';
                c.fillRect(0, 0, W, H);

                // Avatar bulat
                c.save();
                c.beginPath();
                c.arc(62, 62, 34, 0, Math.PI * 2);
                c.clip();
                if (avBuf && loadImage) {
                    try {
                        const img = await loadImage(avBuf);
                        c.drawImage(img, 28, 28, 68, 68);
                    } catch (_) {
                        c.fillStyle = '#1877F2';
                        c.fillRect(28, 28, 68, 68);
                    }
                } else {
                    c.fillStyle = '#1877F2';
                    c.fillRect(28, 28, 68, 68);
                }
                c.restore();

                // Bubble abu-abu khas FB
                drawRoundRect(c, 112, 24, 676, bubbleH, 24);
                c.fillStyle = '#F0F2F5';
                c.fill();

                c.fillStyle = '#050505';
                c.font = 'bold 26px sans-serif';
                c.fillText(author.slice(0, 32), 136, 60);

                c.font = '26px sans-serif';
                lines.forEach((ln, i) => {
                    c.fillText(ln, 136, 98 + i * 34);
                });

                c.fillStyle = '#65676B';
                c.font = 'bold 20px sans-serif';
                c.fillText('Baru saja   ·   Suka   ·   Balas', 136, bubbleH + 56);

                await Dinz.sendMessage(m.chat, { image: canvas.toBuffer('image/png') }, { quoted: m });
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
