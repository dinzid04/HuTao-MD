const moment = require('moment-timezone');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}
let createCanvas = null;
try { ({ createCanvas } = require('canvas')); } catch (_) {}

function escXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function wrapTextLines(str, maxChars = 42, maxLines = 6) {
    const words = String(str || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let cur = '';
    for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length > maxChars && cur) {
            lines.push(cur);
            cur = w.slice(0, maxChars);
            if (lines.length >= maxLines) break;
        } else {
            cur = next;
        }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines;
}

async function renderCardBuffer({ width = 900, height = 520, bg1 = '#0f172a', bg2 = '#1e293b', accent = '#38bdf8', badge = 'HUTAO MAKER', title = '', subtitle = '', rows = [], bodyLines = [], footer = '' }) {
    // 1. High-DPI SVG via sharp (fast, zero font-file issues, crisp vector styling)
    if (sharp) {
        try {
            let y = 148;
            let contentSvg = '';
            if (title) {
                contentSvg += `<text x="64" y="${y}" fill="#f8fafc" font-family="sans-serif" font-size="34" font-weight="bold">${escXml(title)}</text>`;
                y += 40;
            }
            if (subtitle) {
                contentSvg += `<text x="64" y="${y}" fill="#94a3b8" font-family="sans-serif" font-size="20">${escXml(subtitle)}</text>`;
                y += 38;
            }
            for (const r of rows) {
                contentSvg += `<text x="64" y="${y}" fill="#94a3b8" font-family="monospace, sans-serif" font-size="21">${escXml(r.label)}</text>`;
                contentSvg += `<text x="310" y="${y}" fill="#f1f5f9" font-family="sans-serif" font-size="22" font-weight="600">: ${escXml(r.value)}</text>`;
                y += 38;
            }
            if (bodyLines.length) {
                y += 10;
                for (const ln of bodyLines) {
                    contentSvg += `<text x="64" y="${y}" fill="#e2e8f0" font-family="sans-serif" font-size="24">${escXml(ln)}</text>`;
                    y += 36;
                }
            }
            const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="28" fill="url(#bg)"/>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="22" fill="#0b1120" fill-opacity="0.48" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
  <rect x="64" y="56" width="${Math.max(160, badge.length * 14 + 36)}" height="40" rx="20" fill="${accent}"/>
  <text x="82" y="83" fill="#0f172a" font-family="sans-serif" font-size="18" font-weight="bold">${escXml(badge)}</text>
  ${contentSvg}
  <text x="64" y="${height - 52}" fill="${accent}" font-family="sans-serif" font-size="17">${escXml(footer || 'HuTao - MD Local Studio')}</text>
</svg>`;
            return await sharp(Buffer.from(svg)).png().toBuffer();
        } catch (_) {}
    }

    // 2. Node-Canvas fallback
    if (createCanvas) {
        try {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, bg1);
            grad.addColorStop(1, bg2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = accent;
            ctx.lineWidth = 3;
            ctx.strokeRect(28, 28, width - 56, height - 56);

            ctx.fillStyle = accent;
            ctx.fillRect(64, 56, Math.max(180, badge.length * 14 + 36), 40);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 18px Sans';
            ctx.fillText(badge, 80, 82);

            let y = 148;
            if (title) {
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 32px Sans';
                ctx.fillText(title, 64, y);
                y += 40;
            }
            if (subtitle) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px Sans';
                ctx.fillText(subtitle, 64, y);
                y += 38;
            }
            for (const r of rows) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px Sans';
                ctx.fillText(r.label, 64, y);
                ctx.fillStyle = '#f1f5f9';
                ctx.font = 'bold 21px Sans';
                ctx.fillText(`: ${r.value}`, 310, y);
                y += 38;
            }
            for (const ln of bodyLines) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = '23px Sans';
                ctx.fillText(ln, 64, y);
                y += 36;
            }
            ctx.fillStyle = accent;
            ctx.font = '17px Sans';
            ctx.fillText(footer || 'HuTao - MD Local Studio', 64, height - 52);
            return canvas.toBuffer('image/png');
        } catch (_) {}
    }

    return null;
}

const COMMAND_LIST = [
    'ektp', 'fakedana', 'fakebankjago', 'fakeatm', 'boardingpass',
    'fakecall', 'fakestory', 'faketweet', 'fakesertifikat',
    'iqcpink', 'iqcmerah', 'iqcwindows',
    'buatquotes', 'commentquote', 'codesnap', 'kwitansi', 'nokia', 'pakustad'
];

module.exports = {
    name: 'elsyaa-canvas-suite',
    category: 'maker',
    commands: COMMAND_LIST,

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, usedPrefix, checkLimit, addLimit } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const raw = String(text || m.quoted?.text || '').trim();
        const parts = raw.split('|').map((s) => s.trim());
        const now = moment().tz('Asia/Jakarta');
        const userName = m.pushName || 'User';

        let spec = null;

        if (cmd === 'ektp') {
            if (!raw) return Reply(`🪪 Format: \`${pfx}ektp Nama | Tempat, Tgl Lahir | Alamat | Pekerjaan\``);
            const nik = `32${Math.floor(10000000000000 + Math.random() * 89999999999999)}`;
            spec = {
                height: 540, bg1: '#0284c7', bg2: '#0369a1', accent: '#bae6fd',
                badge: 'REPUBLIK WAKANDA — E-KTP PARODI',
                title: `NIK : ${nik}`,
                rows: [
                    { label: 'Nama', value: (parts[0] || userName).toUpperCase() },
                    { label: 'Tempat/Tgl Lahir', value: parts[1] || 'JAKARTA, 01-01-2000' },
                    { label: 'Alamat', value: parts[2] || 'JL. MAWAR INDAH NO. 7' },
                    { label: 'Pekerjaan', value: parts[3] || 'SULTAN DIGITAL' },
                    { label: 'Berlaku Hingga', value: 'SEUMUR HIDUP' }
                ],
                footer: 'Kartu Ilustrasi Parodi • Bukan Dokumen Resmi'
            };
        } else if (cmd === 'fakedana') {
            if (!raw) return Reply(`💙 Format: \`${pfx}fakedana 250.000 | Nama Penerima | Catatan\``);
            spec = {
                height: 520, bg1: '#0284c7', bg2: '#1d4ed8', accent: '#7dd3fc',
                badge: 'DANA TRANSFER RECEIPT (PARODI)',
                title: `Rp ${parts[0] || '500.000'}`,
                subtitle: `Berhasil dikirim pada ${now.format('DD MMM YYYY • HH:mm')} WIB`,
                rows: [
                    { label: 'Penerima', value: parts[1] || userName },
                    { label: 'Metode', value: 'Saldo DANA' },
                    { label: 'Biaya Admin', value: 'Rp 0 (Gratis)' },
                    { label: 'Catatan', value: parts[2] || 'Jajan Kopi' },
                    { label: 'ID Transaksi', value: `DN${Date.now().toString().slice(-10)}` }
                ]
            };
        } else if (cmd === 'fakebankjago') {
            if (!raw) return Reply(`💛 Format: \`${pfx}fakebankjago 1.500.000 | Nama Tujuan | Kantong Utama\``);
            spec = {
                height: 520, bg1: '#78350f', bg2: '#451a03', accent: '#facc15',
                badge: 'BANK JAGO POCKET (PARODI)',
                title: `Rp ${parts[0] || '1.500.000'}`,
                subtitle: `Transaksi Berhasil • ${now.format('DD/MM/YYYY HH:mm')}`,
                rows: [
                    { label: 'Tujuan', value: parts[1] || userName },
                    { label: 'Sumber Kantong', value: parts[2] || 'Kantong Utama' },
                    { label: 'Status', value: 'BERHASIL TERKIRIM' },
                    { label: 'Ref ID', value: `JG-${Math.random().toString(36).slice(2, 10).toUpperCase()}` }
                ]
            };
        } else if (cmd === 'fakeatm') {
            const saldo = parts[0] || '99.850.000';
            spec = {
                height: 500, bg1: '#1e1b4b', bg2: '#0f172a', accent: '#a78bfa',
                badge: 'STRUK INFO SALDO ATM (PARODI)',
                title: `SALDO : Rp ${saldo}`,
                subtitle: `TANGGAL ${now.format('DD/MM/YY')}  WAKTU ${now.format('HH:mm:ss')}`,
                rows: [
                    { label: 'Pemilik Kartu', value: parts[1] || userName.toUpperCase() },
                    { label: 'No. Kartu', value: '**** **** **** 8899' },
                    { label: 'Lokasi ATM', value: 'KCP CENTRAL TOWER' }
                ]
            };
        } else if (cmd === 'boardingpass') {
            if (!raw) return Reply(`✈️ Format: \`${pfx}boardingpass Nama | CGK | NRT | GA-884\``);
            spec = {
                height: 500, bg1: '#0f172a', bg2: '#1e3a8a', accent: '#38bdf8',
                badge: 'BOARDING PASS — FIRST CLASS',
                title: `${(parts[1] || 'CGK').toUpperCase()}  ✈  ${(parts[2] || 'TYO').toUpperCase()}`,
                subtitle: `PASSENGER: ${(parts[0] || userName).toUpperCase()}`,
                rows: [
                    { label: 'Flight', value: (parts[3] || 'HT-777').toUpperCase() },
                    { label: 'Gate / Seat', value: 'A12 / 01A (Window)' },
                    { label: 'Boarding Time', value: `${now.format('DD MMM YYYY')} • 08:45` }
                ]
            };
        } else if (cmd === 'fakecall') {
            if (!raw) return Reply(`📞 Format: \`${pfx}fakecall Nama Kontak | Durasi/Status\``);
            spec = {
                height: 500, bg1: '#064e3b', bg2: '#022c22', accent: '#34d399',
                badge: 'INCOMING WHATSAPP CALL',
                title: parts[0] || userName,
                subtitle: parts[1] || 'Panggilan Video WhatsApp • 04:28',
                rows: [
                    { label: 'Enkripsi', value: 'End-to-End Encrypted' },
                    { label: 'Kualitas', value: 'HD Voice & Video' },
                    { label: 'Waktu', value: `${now.format('HH:mm')} WIB` }
                ]
            };
        } else if (cmd === 'fakestory') {
            if (!raw) return Reply(`📸 Format: \`${pfx}fakestory Username | Isi caption story\``);
            const hasPipe = raw.includes('|');
            const uname = hasPipe ? parts[0] : userName;
            const cap = hasPipe ? parts.slice(1).join(' | ') : raw;
            spec = {
                height: 540, bg1: '#831843', bg2: '#3b0764', accent: '#f472b6',
                badge: `STORY @${uname.replace(/^@/, '')} • Baru saja`,
                title: uname,
                bodyLines: wrapTextLines(cap, 44, 6),
                footer: '👁️ 1.248 tayangan • Balas ke cerita...'
            };
        } else if (cmd === 'faketweet') {
            if (!raw) return Reply(`🐦 Format: \`${pfx}faketweet Nama | @username | Isi tweet\``);
            const name = parts.length >= 3 ? parts[0] : userName;
            const handle = parts.length >= 3 ? parts[1] : `@${userName.toLowerCase().replace(/\s+/g, '')}`;
            const body = parts.length >= 3 ? parts.slice(2).join(' | ') : raw;
            spec = {
                height: 520, bg1: '#090d16', bg2: '#111827', accent: '#38bdf8',
                badge: 'X / TWITTER POST',
                title: `${name} ✓`,
                subtitle: `${handle.startsWith('@') ? handle : '@' + handle} • ${now.format('HH:mm · DD MMM YYYY')}`,
                bodyLines: wrapTextLines(body, 46, 5),
                footer: '💬 428   🔁 2.1K   ❤️ 18.9K   📊 240K Views'
            };
        } else if (cmd === 'fakesertifikat') {
            if (!raw) return Reply(`🏅 Format: \`${pfx}fakesertifikat Nama | Penghargaan\``);
            spec = {
                height: 520, bg1: '#1c1917', bg2: '#292524', accent: '#fbbf24',
                badge: 'CERTIFICATE OF ACHIEVEMENT',
                title: (parts[0] || userName).toUpperCase(),
                subtitle: 'Diberikan atas pencapaian luar biasa sebagai:',
                bodyLines: wrapTextLines(parts[1] || 'Member Paling Aktif & Berprestasi', 42, 4),
                footer: `Diterbitkan pada ${now.format('DD MMMM YYYY')} • HuTao Academy`
            };
        } else if (cmd === 'iqcpink' || cmd === 'iqcmerah' || cmd === 'iqcwindows') {
            if (!raw) return Reply(`💬 Masukkan teks chat! Contoh: \`${pfx}${cmd} Halo lagi ngapain?\``);
            const themes = {
                iqcpink: { bg1: '#500724', bg2: '#831843', accent: '#f472b6', badge: `iPhone Chat Pink • ${now.format('HH:mm')}` },
                iqcmerah: { bg1: '#450a0a', bg2: '#7f1d1d', accent: '#f87171', badge: `iPhone Chat Red • ${now.format('HH:mm')}` },
                iqcwindows: { bg1: '#0c4a6e', bg2: '#1e293b', accent: '#38bdf8', badge: `Windows 11 Chat UI • ${now.format('HH:mm')}` }
            };
            const t = themes[cmd];
            spec = {
                height: 480, bg1: t.bg1, bg2: t.bg2, accent: t.accent,
                badge: t.badge,
                title: userName,
                bodyLines: wrapTextLines(raw, 44, 6),
                footer: 'Delivered ✓✓'
            };
        } else if (cmd === 'buatquotes' || cmd === 'commentquote' || cmd === 'pakustad') {
            if (!raw) return Reply(`✨ Masukkan teks! Contoh: \`${pfx}${cmd} Tetap bernapas walau tugas menumpuk\``);
            const headerMap = {
                buatquotes: { badge: 'DAILY QUOTES', title: `— ${parts[1] || userName}`, body: parts[0] },
                commentquote: { badge: 'TOP COMMENT QUOTE', title: `@${userName}`, body: raw },
                pakustad: { badge: 'PERTANYAAN KE PAK USTAD', title: 'Jamaah Bertanya:', body: raw }
            };
            const h = headerMap[cmd];
            spec = {
                height: 500, bg1: '#111827', bg2: '#1f2937', accent: '#fbbf24',
                badge: h.badge,
                title: h.title,
                bodyLines: wrapTextLines(`"${h.body}"`, 44, 6)
            };
        } else if (cmd === 'codesnap') {
            if (!raw) return Reply(`💻 Reply atau ketik kode! Contoh: \`${pfx}codesnap console.log("Hello HuTao!");\``);
            const codeLines = raw.split(/\r?\n/).slice(0, 9).map((l, idx) => `${String(idx + 1).padStart(2, '0')} | ${l.slice(0, 52)}`);
            spec = {
                width: 980, height: 560, bg1: '#090d16', bg2: '#1e1b4b', accent: '#22d3ee',
                badge: '● ● ●  CODESNAP STUDIO',
                bodyLines: codeLines,
                footer: 'Rendered locally by HuTao - MD'
            };
        } else if (cmd === 'kwitansi') {
            if (!raw) return Reply(`🧾 Format: \`${pfx}kwitansi Nama Pembayar | 750.000 | Pembayaran Jasa Desain\``);
            spec = {
                height: 520, bg1: '#064e3b', bg2: '#0f172a', accent: '#6ee7b7',
                badge: `KWITANSI PEMBAYARAN #KW-${Date.now().toString().slice(-6)}`,
                title: `Rp ${parts[1] || '500.000'},-`,
                rows: [
                    { label: 'Telah Terima Dari', value: parts[0] || userName },
                    { label: 'Untuk Pembayaran', value: parts[2] || 'Pembayaran Produk / Jasa' },
                    { label: 'Tanggal', value: now.format('DD MMMM YYYY') },
                    { label: 'Status', value: 'LUNAS ✓' }
                ]
            };
        } else if (cmd === 'nokia') {
            if (!raw) return Reply(`📟 Contoh: \`${pfx}nokia Sudah makan belum? - Nokia 3310\``);
            spec = {
                height: 460, bg1: '#1a2e05', bg2: '#365314', accent: '#bef264',
                badge: '📶 NOKIA 3310 SMS — 1 PESAN BARU',
                title: `Dari: ${userName}`,
                bodyLines: wrapTextLines(raw, 40, 5),
                footer: 'Pilihan                        Kembali'
            };
        }

        if (!spec) return false;

        await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});
        const png = await renderCardBuffer(spec);
        if (png && Buffer.isBuffer(png)) {
            await Dinz.sendMessage(m.chat, {
                image: png,
                caption: `🎨 *${spec.badge}*`
            }, { quoted: m });
            addLimit(m.sender, isCreator);
            return true;
        }

        const fallbackLines = [
            `\`🎨 ${spec.badge}\``,
            spec.title ? `*${spec.title}*` : '',
            spec.subtitle ? `_${spec.subtitle}_` : '',
            ...(spec.rows || []).map((r) => `> ◦ *${r.label} :* ${r.value}`),
            ...(spec.bodyLines || []).map((l) => `> ${l}`)
        ].filter(Boolean).join('\n');
        await Reply(fallbackLines);
        addLimit(m.sender, isCreator);
        return true;
    }
};
