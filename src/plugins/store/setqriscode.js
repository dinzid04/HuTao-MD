const qrisStore = require('../../services/qris-store');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'setqriscode',
    category: 'store',
    commands: ['setqriscode', 'setkodeqris', 'setrawqris'],

    async execute(ctx) {
        const { Dinz, m, args, text, quoted, mime, qmsg, isCreator, Reply, axios, usedPrefix } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const sub = (args[0] || '').toLowerCase();

        if (sub === 'cek' || sub === 'status' || (!text && !/image/i.test(mime))) {
            const cfg = qrisStore.getQrisConfig(Dinz);
            const feeLabel = cfg.feeType === 'percent'
                ? `${cfg.feeValue}%`
                : cfg.feeType === 'fixed'
                    ? qrisStore.formatRupiah(cfg.feeValue)
                    : 'Tidak ada (Rp 0)';
            return Reply(formatCard({
                icon: '💳',
                title: 'KONFIGURASI QRIS DINAMIS',
                rows: [
                    { label: 'Status', value: cfg.payload ? 'TERPASANG ✅' : 'BELUM DIATUR ❌' },
                    { label: 'Merchant', value: cfg.merchantName || '-' },
                    { label: 'Kota', value: cfg.merchantCity || '-' },
                    { label: 'Biaya Admin (Fee)', value: feeLabel }
                ],
                footer:
                    `Cara pasang:\n` +
                    `• Reply gambar QRIS statis lalu ketik ${usedPrefix}setqriscode\n` +
                    `• Atau paste teks kode QRIS: ${usedPrefix}setqriscode 000201...\n` +
                    `• Atur fee: ${usedPrefix}setqriscode fee 0.7% / 500 / off\n` +
                    `• Hapus: ${usedPrefix}setqriscode reset`
            }));
        }

        if (sub === 'reset' || sub === 'hapus') {
            qrisStore.saveQrisConfig(Dinz, { payload: '', merchantName: '', merchantCity: '', feeType: 'none', feeValue: 0 });
            return Reply('✅ Konfigurasi kode QRIS dinamis berhasil direset.');
        }

        if (sub === 'fee' || sub === 'admin') {
            const val = (args[1] || '').trim().toLowerCase();
            if (!val) {
                return Reply(`❌ Format: \`${usedPrefix}setqriscode fee 0.7%\` atau \`${usedPrefix}setqriscode fee 500\` atau \`${usedPrefix}setqriscode fee off\``);
            }
            if (val === 'off' || val === '0' || val === 'none') {
                qrisStore.saveQrisConfig(Dinz, { feeType: 'none', feeValue: 0 });
                return Reply('✅ Biaya admin QRIS dinamis dinonaktifkan (Rp 0).');
            }
            if (val.endsWith('%')) {
                const pct = parseFloat(val.slice(0, -1).replace(',', '.'));
                if (!Number.isFinite(pct) || pct <= 0 || pct > 25) {
                    return Reply('❌ Persentase fee harus antara 0.1% sampai 25%.');
                }
                qrisStore.saveQrisConfig(Dinz, { feeType: 'percent', feeValue: pct });
                return Reply(`✅ Biaya admin QRIS dinamis diatur ke *${pct}%*.`);
            }
            const fixed = qrisStore.parseRupiah(val);
            if (!Number.isFinite(fixed) || fixed <= 0) {
                return Reply('❌ Nominal fee tidak valid.');
            }
            qrisStore.saveQrisConfig(Dinz, { feeType: 'fixed', feeValue: fixed });
            return Reply(`✅ Biaya admin QRIS dinamis diatur ke *${qrisStore.formatRupiah(fixed)}*.`);
        }

        let rawPayload = String(text || '').trim();
        if (!rawPayload && /image/i.test(mime)) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                let buf = null;
                if (typeof qmsg.download === 'function') buf = await qmsg.download();
                else if (typeof quoted.download === 'function') buf = await quoted.download();
                else if (typeof m.download === 'function') buf = await m.download();
                else buf = await Dinz.downloadMediaMessage(quoted || m);
                if (!buf || !buf.length) throw new Error('Gagal mengunduh gambar QRIS.');
                rawPayload = await qrisStore.decodeQrImageBuffer(axios, buf);
            } catch (err) {
                return Reply(`❌ ${err.message}`);
            }
        }

        const check = qrisStore.validateQrisPayload(rawPayload);
        if (!check.valid) {
            return Reply(`❌ Kode QRIS tidak valid: ${check.reason}`);
        }

        qrisStore.saveQrisConfig(Dinz, {
            payload: check.clean,
            merchantName: check.merchantName,
            merchantCity: check.merchantCity
        });

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '✅',
            title: 'QRIS DINAMIS SIAP DIGUNAKAN',
            rows: [
                { label: 'Merchant', value: check.merchantName },
                { label: 'Kota', value: check.merchantCity },
                { label: 'Panjang Payload', value: `${check.clean.length} karakter (CRC16 Valid)` }
            ],
            footer: `Coba buat QR nominal pas: ${usedPrefix}qris 25000`
        }));
    }
};
