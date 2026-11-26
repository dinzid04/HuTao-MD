const axios = require('axios');
let createCanvas;
try { ({ createCanvas } = require('canvas')); } catch (e) {}

function rrp(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function petal(ctx, cx, cy, r, angle, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.5, -r * 0.8, -r * 0.3, -r * 1.5, 0, -r * 1.6);
    ctx.bezierCurveTo(r * 0.3, -r * 1.5, r * 0.5, -r * 0.8, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function sakura(ctx, cx, cy, r, color, alpha = 1) {
    for (let i = 0; i < 5; i++) petal(ctx, cx, cy, r, (Math.PI * 2 / 5) * i, color, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8f0';
    ctx.fill();
    ctx.restore();
}

function fadeLine(ctx, y, W, color) {
    const g = ctx.createLinearGradient(30, 0, W - 30, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.12, color);
    g.addColorStop(0.88, color);
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(W - 30, y);
    ctx.stroke();
}

function cornerL(ctx, x, y, w, h, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]
        .forEach(([cx, cy, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(cx + dx * size, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * size);
            ctx.stroke();
        });
}

async function renderPrimbonCard(title, subtitle, badge, details) {
    try {
        const W = 720;
        const H = 460;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        const tc = '#e07098';

        const bgG = ctx.createLinearGradient(0, 0, W, H);
        bgG.addColorStop(0, '#fdf8f0');
        bgG.addColorStop(0.5, '#fef9f2');
        bgG.addColorStop(1, '#faf3e8');
        ctx.fillStyle = bgG;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 700; i++) {
            ctx.fillStyle = `rgba(180,140,100,${Math.random() * 0.025 + 0.005})`;
            ctx.beginPath();
            ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 0.9, 0, Math.PI * 2);
            ctx.fill();
        }

        const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, W * 0.78);
        vign.addColorStop(0, 'transparent');
        vign.addColorStop(1, 'rgba(140,90,40,0.14)');
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, W, H);

        const warmBlob = ctx.createRadialGradient(W / 2, 80, 0, W / 2, 80, 240);
        warmBlob.addColorStop(0, 'rgba(224, 112, 152, 0.14)');
        warmBlob.addColorStop(1, 'transparent');
        ctx.fillStyle = warmBlob;
        ctx.fillRect(0, 0, W, H);

        const M = 20;
        rrp(ctx, M, M, W - M * 2, H - M * 2, 16);
        ctx.strokeStyle = '#c9956e';
        ctx.lineWidth = 2;
        ctx.stroke();
        rrp(ctx, M + 6, M + 6, W - M * 2 - 12, H - M * 2 - 12, 12);
        ctx.strokeStyle = 'rgba(201,149,110,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        cornerL(ctx, M + 4, M + 4, W - M * 2 - 8, H - M * 2 - 8, 28, '#c9956e');

        const sp = '#f8a4c0', sl = '#fcc8d8', sd = '#e87098';
        sakura(ctx, 46, 46, 32, sl, 0.20);
        sakura(ctx, W - 50, 38, 25, sp, 0.16);
        sakura(ctx, 38, H - 46, 28, sp, 0.18);
        sakura(ctx, W - 44, H - 50, 30, sl, 0.15);
        [
            [W * 0.86, H * 0.14, 10, 0.3, sp],
            [W * 0.10, H * 0.28, 8, 0.8, sl],
            [W * 0.90, H * 0.70, 9, 1.1, sp],
            [W * 0.12, H * 0.80, 8, 0.2, sd],
        ].forEach(([px, py, pr, pa, pc]) => petal(ctx, px, py, pr, pa, pc, 0.45));

        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#b07850';
        ctx.textAlign = 'center';
        ctx.fillText('✦  PRIMBON JAWA & METAFISIKA NUSANTARA  ✦', W / 2, M + 35);

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#4a1e0a';
        ctx.shadowColor = 'rgba(201,149,110,0.28)';
        ctx.shadowBlur = 10;
        ctx.fillText(title, W / 2, M + 72);
        ctx.shadowBlur = 0;

        if (subtitle) {
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#c9184a';
            ctx.fillText(subtitle, W / 2, M + 102);
        }

        fadeLine(ctx, M + 118, W, 'rgba(201,149,110,0.3)');

        let startY = M + 175;
        if (badge) {
            const badgeW = Math.min(W - 140, Math.max(220, ctx.measureText(badge).width + 50));
            const badgeH = 28;
            const badgeX = (W - badgeW) / 2;
            const badgeY = M + 130;
            rrp(ctx, badgeX, badgeY, badgeW, badgeH, 14);
            ctx.fillStyle = 'rgba(201,149,110,0.15)';
            ctx.fill();
            ctx.strokeStyle = '#c9956e';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#7a3e1a';
            ctx.fillText(badge, W / 2, badgeY + 19);
            startY = M + 185;
        }

        if (details) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#5c2e14';
            ctx.textAlign = 'center';

            const maxLineW = W - 140;
            const words = details.replace(/\s+/g, ' ').trim().split(' ');
            let line = '';
            let currentY = startY;
            let lineCount = 0;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxLineW && n > 0) {
                    ctx.fillText(line.trim(), W / 2, currentY);
                    line = words[n] + ' ';
                    currentY += 24;
                    lineCount++;
                    if (lineCount >= 7) {
                        ctx.fillText(line.trim() + '...', W / 2, currentY);
                        break;
                    }
                } else {
                    line = testLine;
                }
            }
            if (lineCount < 7 && line.trim()) {
                ctx.fillText(line.trim(), W / 2, currentY);
            }
        }

        fadeLine(ctx, H - 38, W, 'rgba(201,149,110,0.28)');
        ctx.font = '9px Arial';
        ctx.fillStyle = 'rgba(154,100,60,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(`${global.botname || 'Bot'}  ·  Primbon & Astrologi System`, W / 2, H - 20);

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error('[Primbon Card Render Error]', err.message);
        return null;
    }
}

function getApiConfig() {
    return {
        baseUrl: global.apiDinz || 'https://docs.lamora.my.id',
        apiKey: global.ApikeyDinz || 'alipaiapikeybaru'
    };
}

async function artiNama(nama) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/artinama?apikey=${apiKey}&nama=${encodeURIComponent(nama)}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const arti = result.arti || 'Arti nama tidak ditemukan.';
        const card = await renderPrimbonCard("ARTI & MAKNA NAMA", nama, "✦ Watak & Karakter ✦", arti);
        const text = `\`⌜ Primbon Arti Nama ⌟\`\n> ◦ *Nama :* ${nama}\n> ◦ *Arti & Makna :*\n${arti}`;
        return { text, card };
    } catch (e) {
        const arti = `Nama "${nama}" melambangkan pribadi yang berjiwa pemimpin, memiliki keteguhan tekad, dan daya tarik alami yang kuat.`;
        const card = await renderPrimbonCard("ARTI & MAKNA NAMA", nama, "✦ Watak & Karakter ✦", arti);
        return { text: `\`⌜ Primbon Arti Nama ⌟\`\n> ◦ *Nama :* ${nama}\n> ◦ *Arti & Makna :*\n${arti}`, card };
    }
}

async function artiMimpi(mimpi) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/artimimpi?apikey=${apiKey}&mimpi=${encodeURIComponent(mimpi)}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const tafsir = result.tafsir || `Mimpi tentang "${mimpi}" pertanda datangnya peluang rezeki dan perubahan hidup yang positif.`;
        const cardSummary = tafsir.replace(/\n/g, ' ').replace(/-/g, '').slice(0, 300).trim();
        const card = await renderPrimbonCard("TAFSIR ARTI MIMPI", mimpi, "✦ Makna & Firasat Mimpi ✦", cardSummary);
        const text = `\`⌜ Primbon Tafsir Mimpi ⌟\`\n> ◦ *Kata Kunci :* ${mimpi}\n> ◦ *Hasil Tafsir :*\n${tafsir}`;
        return { text, card };
    } catch (e) {
        const tafsir = `Mimpi tentang "${mimpi}" merupakan isyarat pertanda baik akan datangnya jalan keluar dari masalah yang sedang dihadapi.`;
        const card = await renderPrimbonCard("TAFSIR ARTI MIMPI", mimpi, "✦ Makna & Firasat Mimpi ✦", tafsir);
        return { text: `\`⌜ Primbon Tafsir Mimpi ⌟\`\n> ◦ *Kata Kunci :* ${mimpi}\n> ◦ *Hasil Tafsir :*\n${tafsir}`, card };
    }
}

async function simbolMimpi(query) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/simbolmimpi?apikey=${apiKey}&query=${encodeURIComponent(query)}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const items = result.items || [];
        if (items.length === 0) throw new Error("Kosong");

        let listText = `\`⌜ Primbon Simbol Mimpi & Kode Alam ⌟\`\n> ◦ *Query :* ${query}\n> ◦ *Sumber :* Primbon.ID\n\n`;
        items.slice(0, 5).forEach((item, idx) => {
            listText += `*${idx + 1}. ${item.mimpi.toUpperCase()}*\n> ◦ *Kode 2D :* ${item.kode2d || '-'}\n> ◦ *Kode 3D :* ${item.kode3d || '-'}\n> ◦ *Kode 4D :* ${item.kode4d || '-'}\n\n`;
        });
        const topItem = items[0];
        const card = await renderPrimbonCard("SIMBOL MIMPI & KODE ALAM", query, `✦ Kode 2D: ${topItem.kode2d} | 3D: ${topItem.kode3d} ✦`, `${topItem.mimpi.toUpperCase()} (2D: ${topItem.kode2d}, 3D: ${topItem.kode3d})`);
        return { text: listText.trim(), card };
    } catch (e) {
        const card = await renderPrimbonCard("SIMBOL MIMPI", query, "✦ Kode Alam Nusantara ✦", `Simbol mimpi "${query}" membawa angka hoki: 2D (42), 3D (318), 4D (7291).`);
        return { text: `\`⌜ Primbon Simbol Mimpi ⌟\`\n> ◦ *Query :* ${query}\n> ◦ *Kode 2D :* 42\n> ◦ *Kode 3D :* 318\n> ◦ *Kode 4D :* 7291`, card };
    }
}

async function kecocokanNama(nama1, nama2) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/jodohnama?apikey=${apiKey}&nama1=${encodeURIComponent(nama1)}&nama2=${encodeURIComponent(nama2)}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const analisis = result.analisis || `${nama1} dan ${nama2} memiliki kecocokan energi 85%, saling melengkapi dan membawa kedamaian rumah tangga.`;
        const card = await renderPrimbonCard("KECOCOKAN JODOH NAMA", `${nama1} ❤️ ${nama2}`, "✦ Ramalan Numerologi Pasangan ✦", analisis);
        const text = `\`⌜ Primbon Kecocokan Nama ⌟\`\n> ◦ *Pasangan :* ${nama1} ❤️ ${nama2}\n\n*Hasil Analisis Kecocokan :*\n${analisis}`;
        return { text, card };
    } catch (e) {
        const analisis = `${nama1} dan ${nama2} memiliki keselarasan energi 82%, saling pengertian dan mampu menghadapi rintangan bersama.`;
        const card = await renderPrimbonCard("KECOCOKAN JODOH NAMA", `${nama1} ❤️ ${nama2}`, "✦ Ramalan Numerologi Pasangan ✦", analisis);
        return { text: `\`⌜ Primbon Kecocokan Nama ⌟\`\n> ◦ *Pasangan :* ${nama1} ❤️ ${nama2}\n\n*Hasil Analisis :*\n${analisis}`, card };
    }
}

async function wetonJawa(tgl = 1, bln = 1, thn = 2000) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/weton?apikey=${apiKey}&tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const card = await renderPrimbonCard("RAMALAN WETON JAWA", result.tanggal || `${tgl}/${bln}/${thn}`, `✦ Neptu : ${result.neptu || '-'} ✦`, result.watakLahir || result.watakHari);
        const text = `\`⌜ Primbon Weton Jawa ⌟\`\n> ◦ *Weton Tanggal :* ${result.tanggal || `${tgl}/${bln}/${thn}`}\n> ◦ *Neptu :* ${result.neptu || '-'}\n> ◦ *Watak Hari :* ${result.watakHari || '-'}\n\n*Watak & Karakter Kelahiran :*\n${result.watakLahir || '-'}`;
        return { text, card };
    } catch (e) {
        const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const pasaranArr = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
        const date = new Date(thn, bln - 1, tgl);
        const hari = hariArr[date.getDay()] || 'Senin';
        const pasaran = pasaranArr[(Math.floor(date.getTime() / 86400000) + 3) % 5] || 'Legi';
        const watak = `Weton ${hari} ${pasaran} memiliki karakter Lakuning Lintang: berwibawa, bijaksana, dan menjadi panutan bagi lingkungan sekitarnya.`;
        const card = await renderPrimbonCard("RAMALAN WETON JAWA", `${tgl}/${bln}/${thn}`, `✦ ${hari} ${pasaran} ✦`, watak);
        return { text: `\`⌜ Primbon Weton Jawa ⌟\`\n> ◦ *Tanggal :* ${tgl}/${bln}/${thn}\n> ◦ *Weton :* ${hari} ${pasaran}\n> ◦ *Watak :* ${watak}`, card };
    }
}

async function ramalanJodoh(nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/ramalanjodoh?apikey=${apiKey}&nama1=${encodeURIComponent(nama1)}&tgl1=${tgl1}&bln1=${bln1}&thn1=${thn1}&nama2=${encodeURIComponent(nama2)}&tgl2=${tgl2}&bln2=${bln2}&thn2=${thn2}`, { timeout: 25000 });
        const result = res.data?.result || {};
        const ramalan = result.ramalan || 'Pertemuan weton membawa keberkahan dan kemakmuran (Kategori RATU).';
        const card = await renderPrimbonCard("RAMALAN JODOH PRIMBON", `${nama1} ❤️ ${nama2}`, "✦ Kitab Betaljemur Adammakna ✦", ramalan);
        const text = `\`⌜ Primbon Ramalan Jodoh ⌟\`\n> ◦ *Pria :* ${nama1} (${tgl1}/${bln1}/${thn1})\n> ◦ *Wanita :* ${nama2} (${tgl2}/${bln2}/${thn2})\n\n*Hasil Ramalan Primbon :*\n> ${ramalan}`;
        return { text, card };
    } catch (e) {
        const ramalan = `Perhitungan neptu pasangan ${nama1} & ${nama2} menghasilkan kategori TUNGGAK SEMI: rezeki selalu mengalir lancar dan rumah tangga rukun.`;
        const card = await renderPrimbonCard("RAMALAN JODOH PRIMBON", `${nama1} ❤️ ${nama2}`, "✦ Kitab Betaljemur Adammakna ✦", ramalan);
        return { text: `\`⌜ Primbon Ramalan Jodoh ⌟\`\n> ◦ *Pasangan :* ${nama1} & ${nama2}\n\n*Hasil Ramalan :*\n> ${ramalan}`, card };
    }
}

async function hariBaik(tgl = 1, bln = 1, thn = 2026) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/haribaik?apikey=${apiKey}&tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const watak = result.watakHari || 'Hari yang sangat baik dan berkah untuk hajatan, akad, dan memulai usaha.';
        const card = await renderPrimbonCard("PETUNG HARI BAIK", `${tgl}/${bln}/${thn}`, "✦ Metode Kamarokam ✦", watak);
        const text = `\`⌜ Primbon Petung Hari Baik ⌟\`\n> ◦ *Tanggal :* ${tgl}/${bln}/${thn}\n> ◦ *Watak Hari :*\n> ${watak}`;
        return { text, card };
    } catch (e) {
        const watak = `Tanggal ${tgl}/${bln}/${thn} tergolong 'Kala Dite': waktu yang baik untuk membuka usaha baru dan perjalanan dinas.`;
        const card = await renderPrimbonCard("PETUNG HARI BAIK", `${tgl}/${bln}/${thn}`, "✦ Metode Kamarokam ✦", watak);
        return { text: `\`⌜ Primbon Petung Hari Baik ⌟\`\n> ◦ *Tanggal :* ${tgl}/${bln}/${thn}\n> ◦ *Watak Hari :*\n> ${watak}`, card };
    }
}

async function rejekiWeton(tgl = 1, bln = 1, thn = 2000) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/rejekiweton?apikey=${apiKey}&tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const ramalan = result.ramalan || 'Puncak kejayaan rezeki berada di usia 24-30 dan 42-48 tahun.';
        const card = await renderPrimbonCard("REJEKI & HOKI WETON", result.hariLahir || `${tgl}/${bln}/${thn}`, "✦ Primbon Pal Srigati ✦", ramalan);
        const text = `\`⌜ Primbon Rejeki & Hoki ⌟\`\n> ◦ *Hari Lahir :* ${result.hariLahir || `${tgl}/${bln}/${thn}`}\n\n*Ramalan Rejeki (Pal Srigati) :*\n${ramalan}`;
        return { text, card };
    } catch (e) {
        const ramalan = `Menurut Pal Srigati, weton ini memiliki skala rezeki 5/6, makmur saat usia 25-32 tahun bila diiringi ketekunan.`;
        const card = await renderPrimbonCard("REJEKI & HOKI WETON", `${tgl}/${bln}/${thn}`, "✦ Primbon Pal Srigati ✦", ramalan);
        return { text: `\`⌜ Primbon Rejeki & Hoki ⌟\`\n> ◦ *Tanggal :* ${tgl}/${bln}/${thn}\n\n*Ramalan Rejeki :*\n${ramalan}`, card };
    }
}

async function ramalanZodiak(zodiakName = 'Aries') {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/zodiak?apikey=${apiKey}&zodiak=${encodeURIComponent(zodiakName)}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const zodiak = result.zodiak || zodiakName.toUpperCase();
        const ramalan = result.ramalan || 'Energi bintang mendukung kemajuan karier dan asmara bulan ini.';
        const card = await renderPrimbonCard("RAMALAN ZODIAK BULAN INI", zodiak, "✦ Astrologi Barat ✦", ramalan.slice(0, 300));
        const text = `\`⌜ Ramalan Zodiak Bulan Ini ⌟\`\n> ◦ *Zodiak :* ${zodiak}\n\n${ramalan}`;
        return { text, card };
    } catch (e) {
        const ramalan = `Zodiak ${zodiakName.toUpperCase()} sedang dinaungi bintang keberuntungan. Finansial stabil dan hubungan asmara kian harmonis.`;
        const card = await renderPrimbonCard("RAMALAN ZODIAK BULAN INI", zodiakName.toUpperCase(), "✦ Astrologi Barat ✦", ramalan);
        return { text: `\`⌜ Ramalan Zodiak Bulan Ini ⌟\`\n> ◦ *Zodiak :* ${zodiakName.toUpperCase()}\n\n${ramalan}`, card };
    }
}

async function ramalanShio(year = 2000) {
    const { baseUrl, apiKey } = getApiConfig();
    try {
        const res = await axios.get(`${baseUrl}/primbon/shio?apikey=${apiKey}&tahun=${year}`, { timeout: 20000 });
        const result = res.data?.result || {};
        const card = await renderPrimbonCard("ASTROLOGI SHIO TIONGHOA", `Shio ${result.shio} (${result.unsur})`, `✦ Tahun Kelahiran : ${result.tahun} ✦`, result.karakter || '-');
        const text = `\`⌜ Astrologi Shio Tionghoa ⌟\`\n> ◦ *Tahun Lahir :* ${result.tahun}\n> ◦ *Shio :* ${result.shio}\n> ◦ *Elemen Unsur :* ${result.unsur}\n\n*Karakter & Sifat Shio :*\n${result.karakter || '-'}`;
        return { text, card };
    } catch (e) {
        const shios = ['Tikus', 'Kerbau', 'Macan', 'Kelinci', 'Naga', 'Ular', 'Kuda', 'Kambing', 'Monyet', 'Ayam', 'Anjing', 'Babi'];
        const shioName = shios[(year - 4) % 12] || 'Naga';
        const karakter = `Shio ${shioName} memiliki daya cipta tinggi, penuh ambisi, dan berkepribadian magnetis yang menarik simpati banyak orang.`;
        const card = await renderPrimbonCard("ASTROLOGI SHIO TIONGHOA", `Shio ${shioName}`, `✦ Tahun : ${year} ✦`, karakter);
        return { text: `\`⌜ Astrologi Shio Tionghoa ⌟\`\n> ◦ *Tahun Lahir :* ${year}\n> ◦ *Shio :* ${shioName}\n\n*Karakter :*\n${karakter}`, card };
    }
}

async function angkaTakdir(d = 1, m = 1, y = 2000) {
    const sum = String(d + m + y).split('').reduce((acc, v) => acc + parseInt(v || 0), 0);
    const lifeNumber = (sum % 9) || 9;
    const makna = `Life Path Number ${lifeNumber}: Sosok visioner, penuh ketabahan, dianugerahi intuisi tajam dan kemampuan memimpin.`;
    const card = await renderPrimbonCard("MYSTIC LIFE NUMBER", `Angka Takdir : ${lifeNumber}`, `✦ Lahir : ${d}/${m}/${y} ✦`, makna);
    return { text: `\`⌜ Mystic Life Number (Angka Takdir) ⌟\`\n> ◦ *Tanggal Lahir :* ${d}/${m}/${y}\n> ◦ *Angka Takdir :* *${lifeNumber}*\n\n*Makna :*\n${makna}`, card };
}

async function tarotReading() {
    const cards = [
        { name: "The Sun (Matahari)", meaning: "Simbol kejayaan, kebahagiaan sejati, energi positif, dan pencerahan hidup." },
        { name: "The Star (Bintang)", meaning: "Simbol harapan baru, inspirasi, ketenangan jiwa, dan pemulihan kesehatan." },
        { name: "Wheel of Fortune (Roda Nasib)", meaning: "Perputaran roda kehidupan membawa keberuntungan tak terduga dan awal babak baru." },
        { name: "The Magician (Sang Penyihir)", meaning: "Kekuatan tekad, manifestasi impian menjadi kenyataan, dan kecerdikan bertindak." },
        { name: "The Empress (Sang Ratu)", meaning: "Kemakmuran melimpah, kesuburan, cinta kasih murni, dan keharmonisan keluarga." },
        { name: "The World (Dunia)", meaning: "Pencapaian paripurna, kesuksesan besar, kepuasan batin, dan kebebasan sejati." }
    ];
    const c = cards[Math.floor(Math.random() * cards.length)];
    const card = await renderPrimbonCard("RAMALAN KARTU TAROT", c.name, "✦ Major Arcana Reading ✦", c.meaning);
    return { text: `\`⌜ Ramalan Kartu Tarot ⌟\`\n> ◦ *Kartu Terpilih :* *${c.name}*\n\n*Makna & Petunjuk :*\n${c.meaning}`, card };
}

async function garisTangan(nama = 'User') {
    const garisList = [
        "Garis Kehidupan (Life Line) melengkung dalam & tebal: Menandakan vitalitas tubuh prima, umur panjang, dan daya tahan tinggi.",
        "Garis Kepala (Head Line) panjang & tegas: Pemikir strategis, cerdas menganalisis peluang finansial.",
        "Garis Hati (Heart Line) mengarah ke jari telunjuk: Pribadi yang setia, hangat, dan mengutamakan ketulusan cinta.",
        "Garis Nasib (Fate Line) lurus ke atas: Sukses berkarier di usia muda dan memiliki kepemimpinan kuat."
    ];
    const summary = garisList.join('\n\n');
    const card = await renderPrimbonCard("TAFSIR GARIS TANGAN", nama, "✦ Seni Palmistri Kuno ✦", garisList[0]);
    return { text: `\`⌜ Tafsir Garis Tangan (Palmistry) ⌟\`\n> ◦ *Nama :* ${nama}\n\n${summary}`, card };
}

async function arahRejeki() {
    const pasaran = ['Legi (Timur / Utara)', 'Pahing (Selatan / Timur)', 'Pon (Barat / Selatan)', 'Wage (Utara / Barat)', 'Kliwon (Pusat / Segala Arah)'];
    const idx = Math.floor(Math.random() * pasaran.length);
    const textDesc = `Hari ini arah rezeki paling utama berada di penjuru *${pasaran[idx]}*. Berangkatlah dengan niat tulus untuk menjemput berkah.`;
    const card = await renderPrimbonCard("PETUNJUK ARAH REZEKI", "HARI INI", "✦ Pawukon Rezeki ✦", textDesc);
    return { text: `\`⌜ Petunjuk Arah Rezeki Hari Ini ⌟\`\n\n> ◦ *Arah Utama :* *${pasaran[idx]}*\n> ◦ *Petuah :* ${textDesc}`, card };
}

async function tanggalLahir(tgl = 1) {
    const day = Math.min(31, Math.max(1, parseInt(tgl) || 1));
    const desc = `Kelahiran tanggal ${day}: Dianugerahi karisma alami, mentalitas pantang menyerah, dan kemampuan diplomasi yang tinggi dalam menyelesaikan masalah.`;
    const card = await renderPrimbonCard("KARAKTER TANGGAL LAHIR", `Tanggal ${day}`, "✦ Metafisika Tanggal ✦", desc);
    return { text: `\`⌜ Karakteristik Tanggal Lahir ⌟\`\n> ◦ *Tanggal :* ${day}\n\n*Analisis Karakter :*\n${desc}`, card };
}

async function potensiPenyakit(wetonName = 'Senin Pon') {
    const desc = `Berdasarkan weton ${wetonName}, titik rentan tubuh berada di area pencernaan dan sirkulasi darah. Disarankan rutin berolahraga dan konsumsi rempah herbal.`;
    const card = await renderPrimbonCard("POTENSI KESEHATAN WETON", wetonName, "✦ Medis Metafisika ✦", desc);
    return { text: `\`⌜ Prediksi Kesehatan & Weton ⌟\`\n> ◦ *Weton :* ${wetonName}\n\n*Peringatan Kesehatan :*\n${desc}`, card };
}

async function sifatUsaha(nama = 'User') {
    const usahaList = [
        "Bidang Perdagangan & Kuliner (Elemen Air)",
        "Bidang Properti, Konstruksi & Logam (Elemen Bumi)",
        "Bidang Teknologi, Digital & Kreatif (Elemen Api)",
        "Bidang Jasa Konsultasi & Pendidikan (Elemen Kayu)"
    ];
    const pick = usahaList[Math.floor(Math.random() * usahaList.length)];
    const desc = `Bidang usaha paling hoki dan menguntungkan untuk ${nama} adalah *${pick}*.`;
    const card = await renderPrimbonCard("SIFAT USAHA & BISNIS HOKI", nama, "✦ Primbon Wiraswasta ✦", desc);
    return { text: `\`⌜ Primbon Sifat Usaha & Bisnis ⌟\`\n> ◦ *Nama :* ${nama}\n\n*Rekomendasi Bisnis :*\n> ${desc}`, card };
}

async function hariSangar(bln = 'Bulan Ini') {
    const desc = `Hindari memulai hajat besar pada hari Selasa Kliwon dan Sabtu Pahing di ${bln} untuk mencegah hambatan energi negatif.`;
    const card = await renderPrimbonCard("HARI SANGAR & NAAS", bln, "✦ Primbon Pawukon ✦", desc);
    return { text: `\`⌜ Peringatan Hari Sangar / Naas ⌟\`\n> ◦ *Periode :* ${bln}\n\n*Petuah :*\n${desc}`, card };
}

async function nagaHari() {
    const arah = ['Naga berada di Barat (Hindari bepergian ke arah Barat)', 'Naga berada di Timur (Hindari bepergian ke arah Timur)', 'Naga berada di Selatan (Hindari bepergian ke arah Selatan)', 'Naga berada di Utara (Hindari bepergian ke arah Utara)'];
    const pick = arah[Math.floor(Math.random() * arah.length)];
    const card = await renderPrimbonCard("NAGA DINA NUSANTARA", "HARI INI", "✦ Petung Bepergian ✦", pick);
    return { text: `\`⌜ Petung Naga Dina (Naga Hari) ⌟\`\n\n> ◦ *Arah Naga :* *${pick}*\n> ◦ *Petunjuk :* Berangkatlah menuju arah sebaliknya untuk keselamatan dan kelancaran hajat.`, card };
}

async function peletWeton(nama = 'User') {
    const rate = Math.floor(Math.random() * 21) + 80;
    const desc = `${nama} memiliki aura pesona pengasihan alami sebesar *${rate}%*. Memiliki pandangan mata yang memikat dan daya pikat tutur kata manis.`;
    const card = await renderPrimbonCard("DAYA TARIK ASMARA WETON", nama, `✦ Pesona Alami : ${rate}% ✦`, desc);
    return { text: `\`⌜ Perhitungan Daya Tarik Asmara Weton ⌟\`\n> ◦ *Nama :* ${nama}\n> ◦ *Tingkat Aura Pesona :* *${rate}%*\n\n*Analisis Pengasihan :*\n${desc}`, card };
}

async function khodamWeton(nama = 'User') {
    const khodamList = [
        "Harimau Putih Siliwangi (Pemberani & Wibawa Raja)",
        "Naga Emas Mahameru (Pelindung Rezeki & Keberkahan)",
        "Ksatria Semar Mesem (Pengasihan & Welas Asih)",
        "Garuda Sakti Dewata (Kecerdasan & Ketajaman Firasat)",
        "Singa Lodaya Sakti (Benteng Gaib & Kewibawaan)"
    ];
    const pick = khodamList[Math.floor(Math.random() * khodamList.length)];
    const desc = `Khodam pelindung bawaan kelahiran ${nama} adalah *${pick}*.`;
    const card = await renderPrimbonCard("CEK KHODAM WETON", nama, "✦ Pendamping Gaib Kelahiran ✦", desc);
    return { text: `\`⌜ Cek Khodam Weton Kelahiran ⌟\`\n> ◦ *Nama :* ${nama}\n\n*Khodam Terdeteksi :*\n> ◦ 🛡️ *${pick}*`, card };
}

async function hariPernikahan(nama1 = 'Pria', nama2 = 'Wanita') {
    const desc = `Hari pernikahan terbaik untuk pasangan ${nama1} & ${nama2} adalah *Jumat Kliwon* atau *Kamis Pahing* (Neptu membawa keberkahan abadi).`;
    const card = await renderPrimbonCard("PETUNG HARI PERNIKAHAN", `${nama1} & ${nama2}`, "✦ Akad Nikah Hoki ✦", desc);
    return { text: `\`⌜ Petung Hari Pernikahan Terbaik ⌟\`\n> ◦ *Calon Pengantin :* ${nama1} & ${nama2}\n\n*Rekomendasi Hari Ijab Qabul :*\n> ${desc}`, card };
}

async function primbonJawa(nama = 'User') {
    const desc = `Intisari Betaljemur Adammakna untuk ${nama}: Berada dalam naungan Wasesa Segara (budi pekerti luhur bagai samudera dan rezeki berlimpah).`;
    const card = await renderPrimbonCard("INTISARI PRIMBON JAWA", nama, "✦ Betaljemur Adammakna ✦", desc);
    return { text: `\`⌜ Intisari Kitab Primbon Jawa ⌟\`\n> ◦ *Nama :* ${nama}\n\n*Ulasan Nasib :*\n${desc}`, card };
}

async function fengShui() {
    const tips = [
        "Pintu utama menghadap Selatan/Timur mendatangkan energi kemakmuran 'Chi' positif.",
        "Letakkan tanaman hias hijau di sudut tenggara ruangan untuk menarik rezeki finansial.",
        "Pastikan aliran udara dan cahaya matahari pagi leluasa masuk ke ruang tamu.",
        "Hindari meletakkan cermin berhadapan langsung dengan tempat tidur."
    ];
    const desc = tips.join('\n\n• ');
    const card = await renderPrimbonCard("FENG SHUI & ENERGI POSITIF", "TATA RUANG", "✦ Harmoni Energi Chi ✦", tips[0]);
    return { text: `\`⌜ Panduan Feng Shui & Energi Hoki ⌟\`\n\n• ${desc}`, card };
}

async function ramalanCinta(nama = 'User') {
    const rate = Math.floor(Math.random() * 31) + 70;
    const desc = `Tingkat keharmonisan asmara ${nama} hari ini mencapai *${rate}%*. Komunikasi terbuka akan membawa hubungan ke jenjang yang lebih manis.`;
    const card = await renderPrimbonCard("RAMALAN ASMARA HARI INI", nama, `✦ Hoki Asmara : ${rate}% ✦`, desc);
    return { text: `\`⌜ Ramalan Cinta & Asmara Hari Ini ⌟\`\n> ◦ *Nama :* ${nama}\n> ◦ *Indeks Asmara :* *${rate}%*\n\n*Prediksi :*\n${desc}`, card };
}

module.exports = {
    renderPrimbonCard,
    artiNama,
    artiMimpi,
    simbolMimpi,
    kecocokanNama,
    wetonJawa,
    ramalanJodoh,
    hariBaik,
    rejekiWeton,
    ramalanZodiak,
    ramalanShio,
    angkaTakdir,
    tarotReading,
    garisTangan,
    arahRejeki,
    tanggalLahir,
    potensiPenyakit,
    sifatUsaha,
    hariSangar,
    nagaHari,
    peletWeton,
    khodamWeton,
    hariPernikahan,
    primbonJawa,
    fengShui,
    ramalanCinta
};
