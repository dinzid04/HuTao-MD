const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { randomBytes } = require('crypto');
const { runFfmpegFile } = require('../audio/_helper');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

const UA_APP = 'HuTaoBot/1.5 (+https://github.com/dinzid04/HuTao-MD)';

const OPERATOR_PREFIX = [
    { name: 'Telkomsel (Simpati/AS/Loop/Halo/by.U)', prefixes: ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'] },
    { name: 'Indosat Ooredoo (IM3/Mentari/Matrix)', prefixes: ['0814', '0815', '0816', '0855', '0856', '0857', '0858'] },
    { name: 'XL Axiata (XL/Live.On)', prefixes: ['0817', '0818', '0819', '0859', '0877', '0878'] },
    { name: 'Axis', prefixes: ['0831', '0832', '0833', '0838'] },
    { name: 'Tri (3 / Three)', prefixes: ['0895', '0896', '0897', '0898', '0899'] },
    { name: 'Smartfren', prefixes: ['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'] }
];

const PLAT_DAERAH = {
    A: 'Banten (Serang, Cilegon, Pandeglang, Lebak)',
    B: 'DKI Jakarta, Depok, Bekasi, Tangerang',
    D: 'Bandung, Cimahi, Bandung Barat',
    E: 'Cirebon, Indramayu, Majalengka, Kuningan',
    F: 'Bogor, Sukabumi, Cianjur',
    T: 'Purwakarta, Karawang, Subang',
    Z: 'Garut, Tasikmalaya, Ciamis, Sumedang, Banjar, Pangandaran',
    G: 'Pekalongan, Tegal, Brebes, Pemalang, Batang',
    H: 'Semarang, Salatiga, Kendal, Demak',
    K: 'Pati, Kudus, Jepara, Rembang, Blora, Grobogan',
    R: 'Banyumas, Cilacap, Purbalingga, Banjarnegara',
    AA: 'Kedu (Magelang, Purworejo, Kebumen, Temanggung, Wonosobo)',
    AB: 'DI Yogyakarta (Sleman, Bantul, Kulon Progo, Gunungkidul)',
    AD: 'Solo / Surakarta, Sukoharjo, Boyolali, Sragen, Karanganyar, Wonogiri, Klaten',
    L: 'Kota Surabaya',
    M: 'Madura (Bangkalan, Sampang, Pamekasan, Sumenep)',
    N: 'Malang, Batu, Pasuruan, Probolinggo, Lumajang',
    P: 'Besuki (Jember, Banyuwangi, Bondowoso, Situbondo)',
    S: 'Bojonegoro, Tuban, Lamongan, Mojokerto, Jombang',
    W: 'Sidoarjo, Gresik',
    AE: 'Madiun, Ngawi, Magetan, Ponorogo, Pacitan',
    AG: 'Kediri, Blitar, Tulungagung, Nganjuk, Trenggalek',
    BA: 'Sumatera Barat', BB: 'Sumatera Utara (Barat)', BD: 'Bengkulu', BE: 'Lampung',
    BG: 'Sumatera Selatan', BH: 'Jambi', BK: 'Sumatera Utara (Medan/Timur)', BL: 'Aceh',
    BM: 'Riau', BN: 'Bangka Belitung', BP: 'Kepulauan Riau (Batam/Bintan)',
    DA: 'Kalimantan Selatan', DB: 'Sulawesi Utara', DC: 'Sulawesi Barat', DD: 'Sulawesi Selatan (Makassar)',
    DE: 'Maluku', DG: 'Maluku Utara', DH: 'NTT (Timor/Kupang)', DK: 'Bali', DL: 'Kepulauan Sangihe/Talaud',
    DM: 'Gorontalo', DN: 'Sulawesi Tengah', DP: 'Sulawesi Selatan (Utara)', DR: 'NTB (Lombok)',
    DS: 'Papua', DT: 'Sulawesi Tenggara', DW: 'Sulawesi Selatan (Bone/Wajo)', EA: 'NTB (Sumbawa)',
    EB: 'NTT (Flores)', ED: 'NTT (Sumba)', KB: 'Kalimantan Barat', KH: 'Kalimantan Tengah',
    KT: 'Kalimantan Timur', KU: 'Kalimantan Utara', PA: 'Papua', PB: 'Papua Barat'
};

const LANG_CODES = [
    ['id', 'Indonesia'], ['en', 'Inggris'], ['ja', 'Jepang'], ['ko', 'Korea'],
    ['zh', 'Mandarin'], ['ar', 'Arab'], ['fr', 'Prancis'], ['de', 'Jerman'],
    ['es', 'Spanyol'], ['ru', 'Rusia'], ['th', 'Thailand'], ['vi', 'Vietnam'],
    ['ms', 'Melayu'], ['jv', 'Jawa'], ['su', 'Sunda'], ['pt', 'Portugis'],
    ['it', 'Italia'], ['nl', 'Belanda'], ['tr', 'Turki'], ['hi', 'Hindi']
];

function safeEvalMath(expr) {
    const clean = String(expr || '')
        .replace(/[×x]/gi, '*')
        .replace(/[÷:]/g, '/')
        .replace(/\^/g, '**')
        .replace(/,/g, '.')
        .trim();
    if (!clean || !/^[0-9+\-*/().%\s]+$/.test(clean) || clean.length > 120) {
        throw new Error('Ekspresi hanya boleh berisi angka & operator (+ - * / % ^ ( )).');
    }
    const result = Function(`"use strict"; return (${clean});`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Hasil perhitungan tidak valid / tak terhingga.');
    }
    return result;
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getJpegDimensions(buf) {
    let i = 2;
    while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
            return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
    }
    return { width: 595, height: 842 };
}

/** Pure-Node single-image JPEG -> PDF generator (zero external packages!) */
function buildSingleJpegPdf(jpegBuf) {
    const { width: iw, height: ih } = getJpegDimensions(jpegBuf);
    const pageW = 595.28;
    const pageH = Math.max(200, Math.round((ih / Math.max(1, iw)) * pageW * 100) / 100);
    const objs = [];
    const offsets = [];
    const parts = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')];
    let pos = parts[0].length;

    const addObj = (contentBufs) => {
        const id = objs.length + 1;
        offsets.push(pos);
        const head = Buffer.from(`${id} 0 obj\n`, 'ascii');
        const tail = Buffer.from('\nendobj\n', 'ascii');
        const full = Buffer.concat([head, ...contentBufs, tail]);
        objs.push(id);
        parts.push(full);
        pos += full.length;
    };

    addObj([Buffer.from('<< /Type /Catalog /Pages 2 0 R >>')]);
    addObj([Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')]);
    addObj([Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)]);
    addObj([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length} >>\nstream\n`),
        jpegBuf,
        Buffer.from('\nendstream')
    ]);
    const streamCmd = Buffer.from(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`);
    addObj([Buffer.from(`<< /Length ${streamCmd.length} >>\nstream\n`), streamCmd, Buffer.from('\nendstream')]);

    const xrefPos = pos;
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    parts.push(Buffer.from(xref, 'ascii'));
    return Buffer.concat(parts);
}

module.exports = {
    name: 'elsyaa-tools',
    category: 'tools',
    commands: [
        'calc', 'kalkulator', 'hitung',
        'base64', 'text2biner', 'biner2text',
        'barcode', 'kurs', 'jarak',
        'cekoperator', 'cekplat', 'kodebahasa', 'kodewilayah',
        'cekwa', 'cekbio', 'getpp',
        'toptv', 'tofile', 'compress', 'compressvid', 'img2pdf',
        'speedtest', 'clonesite', 'getweb', 'cariloker'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, qmsg, mime, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        const FREE_LOCAL = new Set(['calc', 'kalkulator', 'hitung', 'base64', 'text2biner', 'biner2text', 'cekoperator', 'cekplat', 'kodebahasa']);
        if (!FREE_LOCAL.has(cmd) && checkLimit(m.sender, isCreator)) {
            return Reply(global.mess.limit);
        }

        try {
            if (cmd === 'calc' || cmd === 'kalkulator' || cmd === 'hitung') {
                if (!text) return Reply(`🧮 Contoh: \`${pfx}calc (25 + 15) * 4 / 2\``);
                const val = safeEvalMath(text);
                return Reply(`\`🧮 KALKULATOR\`\n> ◦ *Soal :* \`${text}\`\n> ◦ *Hasil :* *${val.toLocaleString('id-ID', { maximumFractionDigits: 8 })}*`);
            }

            if (cmd === 'base64') {
                const mode = (args[0] || '').toLowerCase();
                const payload = args.slice(1).join(' ').trim() || m.quoted?.text || '';
                if (!['enc', 'encode', 'dec', 'decode'].includes(mode) || !payload) {
                    return Reply(`🔐 Format:\n> \`${pfx}base64 enc <teks>\`\n> \`${pfx}base64 dec <base64>\``);
                }
                const out = mode.startsWith('enc')
                    ? Buffer.from(payload, 'utf8').toString('base64')
                    : Buffer.from(payload, 'base64').toString('utf8');
                return Reply(`\`🔐 BASE64 ${mode.startsWith('enc') ? 'ENCODE' : 'DECODE'}\`\n\`\`\`\n${out.slice(0, 3500)}\n\`\`\``);
            }

            if (cmd === 'text2biner') {
                const src = String(text || m.quoted?.text || '').trim();
                if (!src) return Reply(`💻 Contoh: \`${pfx}text2biner HuTao\``);
                const bin = [...Buffer.from(src, 'utf8')].map((b) => b.toString(2).padStart(8, '0')).join(' ');
                return Reply(`\`💻 TEXT → BINER\`\n\`\`\`\n${bin.slice(0, 3500)}\n\`\`\``);
            }

            if (cmd === 'biner2text') {
                const src = String(text || m.quoted?.text || '').trim();
                if (!src) return Reply(`💻 Contoh: \`${pfx}biner2text 01001000 01101001\``);
                const bytes = src.split(/\s+/).map((b) => parseInt(b, 2)).filter((n) => !Number.isNaN(n));
                if (!bytes.length) return Reply('❌ Format biner tidak valid.');
                return Reply(`\`💻 BINER → TEXT\`\n> ${Buffer.from(bytes).toString('utf8')}`);
            }

            if (cmd === 'barcode') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🏷️ Contoh: \`${pfx}barcode HuTao-MD-2026\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get(`https://barcodeapi.org/api/128/${encodeURIComponent(q)}`, { responseType: 'arraybuffer', timeout: 15000 });
                await Dinz.sendMessage(m.chat, { image: Buffer.from(res.data), caption: `🏷️ *Barcode Code128*\n> \`${q}\`` }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'kurs') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const amount = parseFloat(args[0]) || 1;
                const from = (args[1] || 'USD').toUpperCase();
                const to = (args[2] || 'IDR').toUpperCase();
                const res = await axios.get(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, { timeout: 12000 });
                const rates = res.data?.rates;
                if (!rates || !rates[to]) return Reply(`❌ Kode mata uang tidak valid.\n> Contoh: \`${pfx}kurs 100 USD IDR\` atau \`${pfx}kurs 50000 IDR JPY\``);
                const converted = amount * rates[to];
                await Reply(
                    `\`💱 KURS MATA UANG LIVE\`\n` +
                    `> ◦ *${amount.toLocaleString('id-ID')} ${from}* = *${converted.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${to}*\n` +
                    `> ◦ *Rate 1 ${from} :* ${rates[to].toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${to}\n` +
                    `> ◦ *Update :* ${res.data?.time_last_update_utc || '-'}`
                );
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'jarak') {
                const parts = String(text || '').split('|').map((s) => s.trim()).filter(Boolean);
                if (parts.length < 2) return Reply(`🗺️ Contoh: \`${pfx}jarak Jakarta | Bandung\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const lookup = async (place) => {
                    const r = await axios.get('https://nominatim.openstreetmap.org/search', {
                        params: { format: 'json', q: place, limit: 1 },
                        headers: { 'User-Agent': UA_APP },
                        timeout: 12000
                    });
                    return r.data?.[0] || null;
                };
                const [p1, p2] = await Promise.all([lookup(parts[0]), lookup(parts[1])]);
                if (!p1 || !p2) return Reply('❌ Salah satu lokasi tidak ditemukan di OpenStreetMap.');
                const km = haversineKm(Number(p1.lat), Number(p1.lon), Number(p2.lat), Number(p2.lon));
                const estCar = km * 1.25;
                const estHours = estCar / 65;
                await Reply(
                    `\`🗺️ HITUNG JARAK LOKASI\`\n` +
                    `> ◦ *Dari :* ${p1.display_name.split(',').slice(0, 3).join(',')}\n` +
                    `> ◦ *Ke :* ${p2.display_name.split(',').slice(0, 3).join(',')}\n` +
                    `> ◦ *Jarak Garis Lurus :* *${km.toFixed(1)} km*\n` +
                    `> ◦ *Est. Jalan Darat :* ~${estCar.toFixed(1)} km (~${estHours.toFixed(1)} jam)`
                );
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'cekoperator') {
                let num = String(text || '').replace(/[^0-9]/g, '');
                if (!num) return Reply(`📱 Contoh: \`${pfx}cekoperator 085712345678\``);
                if (num.startsWith('62')) num = '0' + num.slice(2);
                const pref = num.slice(0, 4);
                const hit = OPERATOR_PREFIX.find((op) => op.prefixes.includes(pref));
                return Reply(`\`📱 CEK OPERATOR SELULER\`\n> ◦ *Nomor :* ${num}\n> ◦ *Prefix :* \`${pref}\`\n> ◦ *Operator :* *${hit ? hit.name : 'Tidak dikenal / Luar negeri'}*`);
            }

            if (cmd === 'cekplat') {
                const raw = String(text || '').trim().toUpperCase();
                if (!raw) return Reply(`🚗 Contoh: \`${pfx}cekplat B 1234 ABC\` atau \`${pfx}cekplat AB\``);
                const code = (raw.match(/^[A-Z]{1,2}/) || [''])[0];
                const daerah = PLAT_DAERAH[code];
                return Reply(`\`🚗 CEK PLAT NOMOR INDONESIA\`\n> ◦ *Kode Plat :* \`${code || raw}\`\n> ◦ *Wilayah :* *${daerah || 'Kode plat tidak ditemukan'}*`);
            }

            if (cmd === 'kodebahasa') {
                const q = String(text || '').trim().toLowerCase();
                const list = q
                    ? LANG_CODES.filter(([c, n]) => c.includes(q) || n.toLowerCase().includes(q))
                    : LANG_CODES;
                return Reply(`\`🌐 KODE BAHASA (ISO-639)\`\n${list.map(([c, n]) => `> ◦ \`${c}\` — ${n}`).join('\n') || 'Tidak ditemukan.'}`);
            }

            if (cmd === 'kodewilayah') {
                const q = String(text || '').trim().toLowerCase();
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json', { timeout: 12000 });
                const provs = Array.isArray(res.data) ? res.data : [];
                if (!q) {
                    const lines = provs.map((p) => `> ◦ \`${p.id}\` — ${p.name}`);
                    await Reply(`\`🇮🇩 DAFTAR KODE PROVINSI INDONESIA (${provs.length})\`\n${lines.join('\n')}\n\n💡 Lihat kabupaten/kota: \`${pfx}kodewilayah <nama/id provinsi>\``);
                } else {
                    const hit = provs.find((p) => p.id === q || p.name.toLowerCase().includes(q));
                    if (!hit) return Reply(`❌ Provinsi *${q}* tidak ditemukan.`);
                    const regRes = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${hit.id}.json`, { timeout: 12000 });
                    const regs = Array.isArray(regRes.data) ? regRes.data : [];
                    await Reply(`\`🇮🇩 KABUPATEN/KOTA — ${hit.name} (${hit.id})\`\n${regs.map((r) => `> ◦ \`${r.id}\` — ${r.name}`).join('\n')}`);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'cekwa') {
                let target = String(text || '').replace(/[^0-9]/g, '');
                if (!target && m.mentionedJid?.[0]) target = m.mentionedJid[0].split('@')[0];
                if (!target && m.quoted?.sender) target = m.quoted.sender.split('@')[0];
                if (!target) return Reply(`📲 Contoh: \`${pfx}cekwa 6281234567890\``);
                if (target.startsWith('08')) target = '62' + target.slice(1);
                const res = await Dinz.onWhatsApp(`${target}@s.whatsapp.net`);
                const info = Array.isArray(res) ? res[0] : null;
                return Reply(
                    `\`📲 CEK NOMOR WHATSAPP\`\n` +
                    `> ◦ *Nomor :* +${target}\n` +
                    `> ◦ *Status :* ${info?.exists ? '🟢 Terdaftar di WhatsApp' : '🔴 Tidak terdaftar'}\n` +
                    (info?.jid ? `> ◦ *JID :* \`${info.jid}\`` : '')
                );
            }

            if (cmd === 'cekbio') {
                let jid = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || '';
                if (!jid && text) {
                    let num = String(text).replace(/[^0-9]/g, '');
                    if (num.startsWith('08')) num = '62' + num.slice(1);
                    if (num) jid = `${num}@s.whatsapp.net`;
                }
                if (!jid) jid = m.sender;
                const st = await Dinz.fetchStatus(jid).catch(() => null);
                const bio = Array.isArray(st) ? st[0]?.status?.status : (st?.status || '');
                const setAt = Array.isArray(st) ? st[0]?.status?.setAt : st?.setAt;
                return Reply(
                    `\`📝 BIO WHATSAPP\`\n` +
                    `> ◦ *Target :* @${jid.split('@')[0].split(':')[0]}\n` +
                    `> ◦ *Bio :* ${bio || '_Kosong / disembunyikan privasi_'}\n` +
                    (setAt ? `> ◦ *Diperbarui :* ${new Date(setAt).toLocaleDateString('id-ID')}` : ''),
                    [jid]
                );
            }

            if (cmd === 'getpp') {
                let jid = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || '';
                if (!jid && text) {
                    let num = String(text).replace(/[^0-9]/g, '');
                    if (num.startsWith('08')) num = '62' + num.slice(1);
                    if (num) jid = `${num}@s.whatsapp.net`;
                }
                if (!jid) jid = m.sender;
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const url = await Dinz.profilePictureUrl(jid, 'image').catch(() => '');
                if (!url) return Reply('❌ Foto profil tidak tersedia atau disembunyikan privasi.');
                await Dinz.sendMessage(m.chat, { image: { url }, caption: `🖼️ Foto profil @${jid.split('@')[0].split(':')[0]}`, mentions: [jid] }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'toptv') {
                const isVid = /video/i.test(mime || '') || m.quoted?.type === 'videoMessage' || m.type === 'videoMessage';
                if (!isVid) return Reply(`📹 Reply atau kirim *video* dengan caption \`${pfx}toptv\` untuk mengubahnya jadi Video Note bulat (PTV)!`);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const buf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                await Dinz.sendMessage(m.chat, { video: buf, ptv: true, mimetype: 'video/mp4' }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'tofile') {
                const fname = (args[0] || '').trim();
                const content = args.slice(1).join(' ').trim() || m.quoted?.text || '';
                if (!fname || !content) return Reply(`📄 Reply teks/kode lalu ketik \`${pfx}tofile namafile.js\` atau \`${pfx}tofile catatan.txt isi teks\``);
                const safeName = path.basename(fname).replace(/[^a-zA-Z0-9._-]/g, '_') || 'output.txt';
                await Dinz.sendMessage(m.chat, {
                    document: Buffer.from(content, 'utf8'),
                    fileName: safeName,
                    mimetype: 'text/plain'
                }, { quoted: m });
                addLimit(m.sender, isCreator);
                return true;
            }

            if (cmd === 'compress') {
                const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
                if (!isImg) return Reply(`🗜️ Reply/kirim foto lalu ketik \`${pfx}compress [kualitas 15-80]\``);
                if (!sharp) return Reply('❌ Fitur `compress` foto membutuhkan modul `sharp`.');
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const q = Math.max(15, Math.min(85, parseInt(args[0], 10) || 45));
                const rawBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                const outBuf = await sharp(rawBuf).jpeg({ quality: q, mozjpeg: true }).toBuffer();
                const pct = Math.max(0, Math.round((1 - outBuf.length / rawBuf.length) * 100));
                await Dinz.sendMessage(m.chat, {
                    image: outBuf,
                    caption: `🗜️ *Kompresi Selesai*\n> ◦ Sebelum : ${(rawBuf.length / 1024).toFixed(1)} KB\n> ◦ Sesudah : ${(outBuf.length / 1024).toFixed(1)} KB (*-${pct}%*)`
                }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'compressvid') {
                const isVid = /video/i.test(mime || '') || m.quoted?.type === 'videoMessage' || m.type === 'videoMessage';
                if (!isVid) return Reply(`🗜️ Reply/kirim video lalu ketik \`${pfx}compressvid\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const rawBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const uid = `${Date.now()}_${randomBytes(3).toString('hex')}`;
                const inF = path.join(tmpDir, `cv_in_${uid}.mp4`);
                const outF = path.join(tmpDir, `cv_out_${uid}.mp4`);
                try {
                    fs.writeFileSync(inF, rawBuf);
                    await runFfmpegFile(['-y', '-i', inF, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '30', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outF]);
                    const outBuf = fs.readFileSync(outF);
                    const pct = Math.max(0, Math.round((1 - outBuf.length / rawBuf.length) * 100));
                    await Dinz.sendMessage(m.chat, {
                        video: outBuf,
                        caption: `🗜️ *Video Dikompresi*\n> ◦ Sebelum : ${(rawBuf.length / 1048576).toFixed(2)} MB\n> ◦ Sesudah : ${(outBuf.length / 1048576).toFixed(2)} MB (*-${pct}%*)`
                    }, { quoted: m });
                    addLimit(m.sender, isCreator);
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                } finally {
                    try { if (fs.existsSync(inF)) fs.unlinkSync(inF); } catch (_) {}
                    try { if (fs.existsSync(outF)) fs.unlinkSync(outF); } catch (_) {}
                }
                return true;
            }

            if (cmd === 'img2pdf') {
                const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
                if (!isImg) return Reply(`📑 Reply/kirim *foto* lalu ketik \`${pfx}img2pdf [namafile]\`!`);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                let rawBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                // Pastikan format JPEG agar PDF DCTDecode 100% valid
                if (!(rawBuf[0] === 0xff && rawBuf[1] === 0xd8)) {
                    if (sharp) {
                        rawBuf = await sharp(rawBuf).jpeg({ quality: 90 }).toBuffer();
                    } else {
                        const tmpDir = path.join(process.cwd(), 'tmp');
                        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                        const uid = `${Date.now()}_${randomBytes(3).toString('hex')}`;
                        const inF = path.join(tmpDir, `p_in_${uid}`);
                        const outF = path.join(tmpDir, `p_out_${uid}.jpg`);
                        try {
                            fs.writeFileSync(inF, rawBuf);
                            await runFfmpegFile(['-y', '-i', inF, outF]);
                            rawBuf = fs.readFileSync(outF);
                        } finally {
                            try { if (fs.existsSync(inF)) fs.unlinkSync(inF); } catch (_) {}
                            try { if (fs.existsSync(outF)) fs.unlinkSync(outF); } catch (_) {}
                        }
                    }
                }
                const pdfBuf = buildSingleJpegPdf(rawBuf);
                const fname = (String(text || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_') || `image_${Date.now()}`).replace(/\.pdf$/i, '') + '.pdf';
                await Dinz.sendMessage(m.chat, { document: pdfBuf, mimetype: 'application/pdf', fileName: fname }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'speedtest') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const tPing0 = Date.now();
                await axios.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 10000 }).catch(() => {});
                const pingMs = Date.now() - tPing0;

                const tDl0 = Date.now();
                const dlRes = await axios.get('https://speed.cloudflare.com/__down?bytes=2500000', { responseType: 'arraybuffer', timeout: 20000 });
                const dlSec = Math.max(0.05, (Date.now() - tDl0) / 1000);
                const mbps = ((dlRes.data.byteLength * 8) / (dlSec * 1_000_000)).toFixed(2);
                await Reply(
                    `\`🚀 SERVER SPEEDTEST\`\n` +
                    `> ◦ *Ping Cloudflare :* ${pingMs} ms\n` +
                    `> ◦ *Download Speed :* *${mbps} Mbps*\n` +
                    `> ◦ *Payload Uji :* ${(dlRes.data.byteLength / 1048576).toFixed(2)} MB dalam ${dlSec.toFixed(2)}s`
                );
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'clonesite' || cmd === 'getweb') {
                let url = String(args[0] || '').trim();
                if (!url) return Reply(`🌐 Contoh: \`${pfx}getweb https://example.com\``);
                if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get(url, { headers: { 'User-Agent': UA_APP }, timeout: 15000, responseType: 'text', maxContentLength: 4 * 1024 * 1024 });
                const host = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '_');
                await Dinz.sendMessage(m.chat, {
                    document: Buffer.from(String(res.data || ''), 'utf8'),
                    mimetype: 'text/html',
                    fileName: `${host}.html`,
                    caption: `🌐 Source HTML dari *${url}*`
                }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'cariloker') {
                const q = String(text || '').trim() || 'developer';
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get('https://himalayas.app/jobs/api/search', {
                    params: { q, limit: 6 },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 15000
                });
                const jobs = (res.data?.jobs || []).slice(0, 6);
                if (!jobs.length) return Reply(`❌ Lowongan remote untuk *${q}* tidak ditemukan.`);
                const body = jobs.map((j, i) =>
                    `*${i + 1}. ${j.title || '-'}*\n` +
                    `   🏢 ${j.companyName || '-'} • 🌍 ${(j.locationRestrictions || []).join(', ') || 'Worldwide'}\n` +
                    `   🔗 ${j.applicationLink || j.guid || '-'}`
                ).join('\n\n');
                await Reply(`\`💼 LOWONGAN KERJA REMOTE — ${q.toUpperCase()}\`\n\n${body}`);
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
