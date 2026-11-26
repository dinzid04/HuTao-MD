const {
    formatCard,
    toMono,
    requireMainSetupAccess,
    updateSettingsPayment,
    uploadImageToCdn
} = require('./_helper');

module.exports = {
    name: 'setpay',
    category: 'setup',
    commands: ['setpay', 'setpayment', 'setglobalpay', 'setqris'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, command, args, text, Reply, example, uploadToCDN, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);

        if (isImg) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                const buffer = await qMsg.download();
                const cdnUrl = await uploadImageToCdn(buffer, mimeType, uploadToCDN);
                if (!cdnUrl) {
                    return Reply('❌ Gagal mengunggah foto QRIS ke CDN. Pastikan server CDN aktif.');
                }
                updateSettingsPayment({ qris: cdnUrl });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '💳',
                    title: 'QRIS BOT UTAMA DIUBAH',
                    rows: [
                        { label: 'QRIS URL', value: cdnUrl },
                        { label: 'Penyimpanan', value: 'Permanen di settings.js (global.payment & global.image)' }
                    ]
                }));
            } catch (err) {
                return Reply(`❌ Gagal mengunduh / mengunggah foto QRIS: ${err.message}`);
            }
        }

        if (command === 'setqris' && text && /^https?:\/\//i.test(text.trim())) {
            const newUrl = text.trim();
            updateSettingsPayment({ qris: newUrl });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '💳',
                title: 'QRIS BOT UTAMA DIUBAH',
                rows: [
                    { label: 'QRIS URL', value: newUrl },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        const subCmd = (args[0] || '').toLowerCase();
        const subVal = args.slice(1).join(' ').trim();

        if (subCmd === 'dana') {
            if (!subVal) return Reply(example('dana 081234567890'));
            updateSettingsPayment({ dana: subVal });
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT BOT UTAMA DIUBAH',
                rows: [
                    { label: 'Dana', value: toMono(subVal) },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        if (subCmd === 'gopay') {
            if (!subVal) return Reply(example('gopay 081234567890'));
            updateSettingsPayment({ gopay: subVal });
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT BOT UTAMA DIUBAH',
                rows: [
                    { label: 'GoPay', value: toMono(subVal) },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        if (subCmd === 'an' || subCmd === 'atasnama' || subCmd === 'nama') {
            if (!subVal) return Reply(example('an Nama Anda'));
            updateSettingsPayment({ an: subVal });
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT BOT UTAMA DIUBAH',
                rows: [
                    { label: 'Atas Nama (A/N)', value: subVal },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        if (subCmd === 'qris') {
            if (!subVal || !/^https?:\/\//i.test(subVal)) return Reply(example('qris https://url-gambar-qris.jpg'));
            updateSettingsPayment({ qris: subVal });
            return Reply(formatCard({
                icon: '💳',
                title: 'QRIS BOT UTAMA DIUBAH',
                rows: [
                    { label: 'QRIS URL', value: subVal },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        const pay = global._mainConfig?.payment || global.payment || {};
        return Reply(formatCard({
            icon: '💳',
            title: 'PENGATURAN GLOBAL PAYMENT BOT UTAMA',
            rows: [
                { label: 'Dana', value: toMono(pay.dana || '-') },
                { label: 'GoPay', value: toMono(pay.gopay || '-') },
                { label: 'Atas Nama', value: pay.an || '-' },
                { label: 'QRIS', value: pay.qris || '-' }
            ],
            body:
                `📌 *Cara Penggunaan:*\n` +
                `> 1. *Ganti Foto QRIS:* Kirim / reply foto dengan caption \`${usedPrefix}setpay\`\n` +
                `> 2. *Ganti URL QRIS:* \`${usedPrefix}setpay qris <url_gambar>\`\n` +
                `> 3. *Ganti Dana:* \`${usedPrefix}setpay dana <nomor>\`\n` +
                `> 4. *Ganti GoPay:* \`${usedPrefix}setpay gopay <nomor>\`\n` +
                `> 5. *Ganti Atas Nama:* \`${usedPrefix}setpay an <nama>\``
        }));
    }
};
