const https = require('https');
const moment = require('moment-timezone');
const botCtx = require('../core/context');

function crc16CCITT(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseEmvTlv(payload) {
    const clean = String(payload || '').trim();
    const tags = [];
    let i = 0;
    while (i + 4 <= clean.length) {
        const id = clean.slice(i, i + 2);
        const lenStr = clean.slice(i + 2, i + 4);
        if (!/^\d{2}$/.test(lenStr)) return null;
        const len = parseInt(lenStr, 10);
        if (i + 4 + len > clean.length) return null;
        const value = clean.slice(i + 4, i + 4 + len);
        tags.push({ id, value });
        i += 4 + len;
    }
    if (i !== clean.length) return null;
    return tags;
}

function formatTlv(id, value) {
    const valStr = String(value);
    const lenStr = String(valStr.length).padStart(2, '0');
    return `${id}${lenStr}${valStr}`;
}

function validateQrisPayload(payload) {
    const clean = String(payload || '').trim();
    if (!clean.startsWith('000201')) {
        return { valid: false, reason: 'Payload QRIS harus diawali dengan 000201.' };
    }
    const tags = parseEmvTlv(clean);
    if (!tags || tags.length < 4) {
        return { valid: false, reason: 'Struktur EMVCo TLV QRIS tidak valid.' };
    }
    const crcTag = tags.find((t) => t.id === '63');
    if (!crcTag || crcTag.value.length !== 4) {
        return { valid: false, reason: 'Checksum CRC16 (tag 63) tidak ditemukan.' };
    }
    const bodyWithoutCrc = clean.slice(0, -4);
    const expected = crc16CCITT(bodyWithoutCrc);
    if (expected !== crcTag.value.toUpperCase()) {
        return { valid: false, reason: `Checksum CRC16 tidak cocok (seharusnya ${expected}, terbaca ${crcTag.value}).` };
    }
    const merchantName = tags.find((t) => t.id === '59')?.value || 'MERCHANT QRIS';
    const merchantCity = tags.find((t) => t.id === '60')?.value || 'INDONESIA';
    return { valid: true, tags, merchantName, merchantCity, clean };
}

function convertStaticToDynamicQris(staticPayload, amount, feeOpts = {}) {
    const check = validateQrisPayload(staticPayload);
    if (!check.valid) throw new Error(check.reason);

    const numAmount = Math.floor(Number(amount));
    if (!Number.isFinite(numAmount) || numAmount < 1) {
        throw new Error('Nominal harus berupa angka positif minimal Rp 1.');
    }

    const feeType = feeOpts.feeType || 'none';
    const feeValue = Number(feeOpts.feeValue) || 0;
    let feeAmount = 0;
    if (feeType === 'fixed' && feeValue > 0) {
        feeAmount = Math.round(feeValue);
    } else if (feeType === 'percent' && feeValue > 0) {
        feeAmount = Math.ceil((numAmount * feeValue) / 100);
    }

    const filtered = check.tags.filter((t) => !['54', '55', '56', '57', '63'].includes(t.id));
    const rebuilt = [];
    let insertedAmount = false;

    for (const tag of filtered) {
        if (tag.id === '01') {
            rebuilt.push({ id: '01', value: '12' });
            continue;
        }
        if (tag.id === '58' && !insertedAmount) {
            rebuilt.push({ id: '54', value: String(numAmount) });
            if (feeType === 'fixed' && feeValue > 0) {
                rebuilt.push({ id: '55', value: '02' });
                rebuilt.push({ id: '56', value: String(Math.round(feeValue)) });
            } else if (feeType === 'percent' && feeValue > 0) {
                rebuilt.push({ id: '55', value: '03' });
                rebuilt.push({ id: '57', value: String(feeValue) });
            }
            insertedAmount = true;
        }
        rebuilt.push(tag);
    }

    if (!insertedAmount) {
        rebuilt.push({ id: '54', value: String(numAmount) });
        if (feeType === 'fixed' && feeValue > 0) {
            rebuilt.push({ id: '55', value: '02' });
            rebuilt.push({ id: '56', value: String(Math.round(feeValue)) });
        } else if (feeType === 'percent' && feeValue > 0) {
            rebuilt.push({ id: '55', value: '03' });
            rebuilt.push({ id: '57', value: String(feeValue) });
        }
    }

    const rawBody = rebuilt.map((t) => formatTlv(t.id, t.value)).join('') + '6304';
    const crc = crc16CCITT(rawBody);
    return {
        payload: rawBody + crc,
        merchantName: check.merchantName,
        merchantCity: check.merchantCity,
        amount: numAmount,
        feeAmount,
        total: numAmount + feeAmount
    };
}

function parseRupiah(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/^rp\.?\s*/i, '').replace(/\s+/g, '');
    if (!s) return NaN;
    const suffixMatch = s.match(/^([\d.,]+)(k|rb|ribu|jt|juta)?$/);
    if (!suffixMatch) return NaN;
    const unit = suffixMatch[2] || '';
    if (unit) {
        const base = parseFloat(suffixMatch[1].replace(/,/g, '.'));
        if (!Number.isFinite(base)) return NaN;
        if (unit === 'k' || unit === 'rb' || unit === 'ribu') return Math.round(base * 1000);
        if (unit === 'jt' || unit === 'juta') return Math.round(base * 1000000);
    }
    const digits = suffixMatch[1].replace(/[.,]/g, '');
    return parseInt(digits, 10);
}

function formatRupiah(num) {
    const n = Math.round(Number(num) || 0);
    return `Rp ${n.toLocaleString('id-ID')}`;
}

function getQrisConfig(Dinz) {
    const data = botCtx.getSection('store_qris', Dinz);
    if (!data || typeof data !== 'object') {
        return { payload: '', merchantName: '', merchantCity: '', feeType: 'none', feeValue: 0 };
    }
    return {
        payload: String(data.payload || ''),
        merchantName: String(data.merchantName || ''),
        merchantCity: String(data.merchantCity || ''),
        feeType: data.feeType || 'none',
        feeValue: Number(data.feeValue) || 0
    };
}

function saveQrisConfig(Dinz, patch) {
    const next = { ...getQrisConfig(Dinz), ...patch };
    botCtx.setSection('store_qris', next, Dinz);
    return next;
}

async function fetchQrImageBuffer(axios, textData) {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const urls = [];
    if (global.apiDinz && global.ApikeyDinz) {
        urls.push(`${global.apiDinz}/tools/qr-custom?apikey=${encodeURIComponent(global.ApikeyDinz)}&text=${encodeURIComponent(textData)}&color=%23000000&size=512`);
    }
    urls.push(`https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=16&ecc=M&data=${encodeURIComponent(textData)}`);

    for (const url of urls) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                httpsAgent,
                validateStatus: () => true
            });
            const ct = String(res.headers?.['content-type'] || '');
            if (res.status === 200 && res.data && res.data.length > 200 && (!ct || ct.includes('image'))) {
                return Buffer.from(res.data);
            }
        } catch (_) {}
    }
    throw new Error('Gagal membuat gambar QR dari server.');
}

async function decodeQrImageBuffer(axios, imgBuffer) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', imgBuffer, { filename: 'qris.jpg', contentType: 'image/jpeg' });
    const res = await axios.post('https://api.qrserver.com/v1/read-qr-code/', form, {
        headers: form.getHeaders(),
        timeout: 20000,
        validateStatus: () => true
    });
    const data = res.data?.[0]?.symbol?.[0]?.data;
    if (!data || typeof data !== 'string') {
        throw new Error('QR tidak terbaca dari gambar. Pastikan gambar QRIS jelas atau kirim teks kode QRIS langsung.');
    }
    return data.trim();
}

async function renderDynamicQrisCard({ qrBuffer, merchantName, merchantCity, amount, feeAmount, total, note, botname }) {
    try {
        const { createCanvas, loadImage } = require('canvas');
        const W = 720;
        const H = 920;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(1, '#1E293B');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(0, 0, W, 10);

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QRIS DYNAMIC PAYMENT', W / 2, 58);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText(String(merchantName || 'STORE QRIS').slice(0, 30), W / 2, 102);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '20px sans-serif';
        ctx.fillText(String(merchantCity || 'INDONESIA').toUpperCase(), W / 2, 134);

        const boxSize = 460;
        const boxX = (W - boxSize) / 2;
        const boxY = 165;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(boxX, boxY, boxSize, boxSize, 24) : ctx.rect(boxX, boxY, boxSize, boxSize);
        ctx.fill();

        const qrImg = await loadImage(qrBuffer);
        ctx.drawImage(qrImg, boxX + 20, boxY + 20, boxSize - 40, boxSize - 40);

        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(60, 655, W - 120, 175, 18) : ctx.rect(60, 655, W - 120, 175);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '20px sans-serif';
        ctx.fillText('TOTAL PEMBAYARAN', W / 2, 695);

        ctx.fillStyle = '#34D399';
        ctx.font = 'bold 46px sans-serif';
        ctx.fillText(formatRupiah(total), W / 2, 750);

        const subLine = feeAmount > 0
            ? `Nominal ${formatRupiah(amount)} + Admin ${formatRupiah(feeAmount)}`
            : (note ? String(note).slice(0, 46) : 'Scan via Dana / GoPay / OVO / ShopeePay / M-Banking');
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '19px sans-serif';
        ctx.fillText(subLine, W / 2, 795);

        ctx.fillStyle = '#64748B';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Powered by ${botname || 'HuTao - MD'} • Nominal Terkunci Otomatis`, W / 2, 878);

        return canvas.toBuffer('image/png');
    } catch (_) {
        return qrBuffer;
    }
}

function getStoreTxStore(Dinz) {
    const raw = botCtx.getSection('store_tx', Dinz);
    if (!raw || typeof raw !== 'object') {
        return { seq: 0, orders: [] };
    }
    return {
        seq: Number(raw.seq) || 0,
        orders: Array.isArray(raw.orders) ? raw.orders : []
    };
}

function saveStoreTxStore(Dinz, store) {
    if (store.orders.length > 500) {
        store.orders = store.orders.slice(-500);
    }
    botCtx.setSection('store_tx', store, Dinz);
}

function createOrder(Dinz, { chatId, buyerJid, buyerName, sellerJid, item, price, status = 'pending', note = '' }) {
    const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
    const store = getStoreTxStore(Dinz);
    store.seq += 1;
    const datePart = moment().tz(tz).format('YYYYMMDD');
    const id = `INV-${datePart}-${String(store.seq).padStart(3, '0')}`;
    const now = Date.now();
    const order = {
        id,
        chatId: chatId || '',
        buyerJid: buyerJid || '',
        buyerName: buyerName || 'Customer',
        sellerJid: sellerJid || '',
        item: String(item || 'Pesanan').trim(),
        price: Math.max(0, Math.round(Number(price) || 0)),
        note: String(note || '').trim(),
        status,
        createdAt: now,
        updatedAt: now,
        completedAt: status === 'done' ? now : 0
    };
    store.orders.push(order);
    saveStoreTxStore(Dinz, store);
    return order;
}

function findOrder(Dinz, { id, buyerJid, chatId, onlyPending = false }) {
    const store = getStoreTxStore(Dinz);
    const list = [...store.orders].reverse();
    if (id) {
        const cleanId = String(id).trim().toUpperCase();
        const exact = list.find((o) => o.id.toUpperCase() === cleanId && (!onlyPending || o.status === 'pending'));
        if (exact) return { store, order: exact };
    }
    if (buyerJid) {
        const cleanBuyer = String(buyerJid).split('@')[0].split(':')[0];
        const byBuyer = list.find((o) => {
            const ob = String(o.buyerJid || '').split('@')[0].split(':')[0];
            return ob === cleanBuyer && (!onlyPending || o.status === 'pending');
        });
        if (byBuyer) return { store, order: byBuyer };
    }
    if (chatId) {
        const byChat = list.find((o) => o.chatId === chatId && (!onlyPending || o.status === 'pending'));
        if (byChat) return { store, order: byChat };
    }
    return { store, order: null };
}

function updateOrderStatus(Dinz, orderId, status) {
    const store = getStoreTxStore(Dinz);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target) return null;
    target.status = status;
    target.updatedAt = Date.now();
    if (status === 'done') target.completedAt = Date.now();
    saveStoreTxStore(Dinz, store);
    return target;
}

async function renderNotaImage({ order, botname }) {
    try {
        const { createCanvas } = require('canvas');
        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const W = 720;
        const H = 520;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0B1120');
        bg.addColorStop(1, '#1E293B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const accent = order.status === 'done' ? '#10B981' : order.status === 'cancelled' ? '#EF4444' : '#F59E0B';
        const badgeLabel = order.status === 'done' ? 'TRANSAKSI SELESAI' : order.status === 'cancelled' ? 'DIBATALKAN' : 'SEDANG DIPROSES';

        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 10);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(botname || 'STORE').slice(0, 26), 44, 64);

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(W - 255, 34, 211, 40, 20) : ctx.rect(W - 255, 34, 211, 40);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(badgeLabel, W - 150, 60);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(44, 96);
        ctx.lineTo(W - 44, 96);
        ctx.stroke();

        const rows = [
            ['Invoice ID', order.id],
            ['Pembeli', String(order.buyerName || '-').slice(0, 32)],
            ['Produk / Jasa', String(order.item || '-').slice(0, 34)],
            ['Total Harga', formatRupiah(order.price)],
            ['Waktu', moment(order.updatedAt || order.createdAt).tz(tz).format('DD MMM YYYY • HH:mm [WIB]')]
        ];
        if (order.note) rows.push(['Catatan', String(order.note).slice(0, 36)]);

        let y = 148;
        for (const [k, v] of rows) {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#94A3B8';
            ctx.font = '21px sans-serif';
            ctx.fillText(k, 48, y);

            ctx.textAlign = 'right';
            ctx.fillStyle = k === 'Total Harga' ? '#34D399' : '#F8FAFC';
            ctx.font = k === 'Total Harga' ? 'bold 28px sans-serif' : 'bold 21px sans-serif';
            ctx.fillText(v, W - 48, y);
            y += 52;
        }

        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(44, H - 72);
        ctx.lineTo(W - 44, H - 72);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748B';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Terima kasih telah bertransaksi di ${botname || 'Store'}!`, W / 2, H - 34);

        return canvas.toBuffer('image/png');
    } catch (_) {
        return null;
    }
}

module.exports = {
    crc16CCITT,
    parseEmvTlv,
    validateQrisPayload,
    convertStaticToDynamicQris,
    parseRupiah,
    formatRupiah,
    getQrisConfig,
    saveQrisConfig,
    fetchQrImageBuffer,
    decodeQrImageBuffer,
    renderDynamicQrisCard,
    getStoreTxStore,
    saveStoreTxStore,
    createOrder,
    findOrder,
    updateOrderStatus,
    renderNotaImage
};
