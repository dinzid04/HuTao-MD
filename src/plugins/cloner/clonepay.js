const {
    formatCard,
    toMono,
    requireClonerOwner,
    patchCloneConfig,
    uploadCloneImageToCdn
} = require('./_helper');

module.exports = {
    name: 'clonepay',
    category: 'cloner',
    commands: ['clonepay', 'clonepayment', 'cloneqris'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, command, args, text, Reply, example, uploadToCDN, botCtx, jadibotMgr, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);

        if (isImg) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                const buffer = await qMsg.download();
                const cdnUrl = await uploadCloneImageToCdn(buffer, mimeType, uploadToCDN);
                if (!cdnUrl) return Reply('❌ Gagal mengunggah foto QRIS ke CDN.');
                patchCloneConfig(cloneNum, { payment: { qris: cdnUrl }, image: { qris: cdnUrl } }, botCtx, jadibotMgr);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '💳',
                    title: 'QRIS CLONE DIUBAH',
                    rows: [
                        { label: 'QRIS URL', value: cdnUrl },
                        { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                    ]
                }));
            } catch (err) {
                return Reply(`❌ Gagal memproses foto QRIS: ${err.message}`);
            }
        }

        if (command === 'cloneqris' && text && /^https?:\/\//i.test(text.trim())) {
            const newUrl = text.trim();
            patchCloneConfig(cloneNum, { payment: { qris: newUrl }, image: { qris: newUrl } }, botCtx, jadibotMgr);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '💳',
                title: 'QRIS CLONE DIUBAH',
                rows: [
                    { label: 'QRIS URL', value: newUrl },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        const subCmd = (args[0] || '').toLowerCase();
        const subVal = args.slice(1).join(' ').trim();

        if (subCmd === 'dana') {
            if (!subVal) return Reply(example('dana 081234567890'));
            patchCloneConfig(cloneNum, { payment: { dana: subVal } }, botCtx, jadibotMgr);
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT CLONE DIUBAH',
                rows: [
                    { label: 'Dana', value: toMono(subVal) },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        if (subCmd === 'gopay') {
            if (!subVal) return Reply(example('gopay 081234567890'));
            patchCloneConfig(cloneNum, { payment: { gopay: subVal } }, botCtx, jadibotMgr);
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT CLONE DIUBAH',
                rows: [
                    { label: 'GoPay', value: toMono(subVal) },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        if (subCmd === 'an' || subCmd === 'atasnama' || subCmd === 'nama') {
            if (!subVal) return Reply(example('an Nama Kamu'));
            patchCloneConfig(cloneNum, { payment: { an: subVal } }, botCtx, jadibotMgr);
            return Reply(formatCard({
                icon: '💳',
                title: 'PAYMENT CLONE DIUBAH',
                rows: [
                    { label: 'Atas Nama (A/N)', value: subVal },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        if (subCmd === 'qris') {
            if (!subVal || !/^https?:\/\//i.test(subVal)) return Reply(example('qris https://url-gambar-qris.jpg'));
            patchCloneConfig(cloneNum, { payment: { qris: subVal }, image: { qris: subVal } }, botCtx, jadibotMgr);
            return Reply(formatCard({
                icon: '💳',
                title: 'QRIS CLONE DIUBAH',
                rows: [
                    { label: 'QRIS URL', value: subVal },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        const pay = botCtx.getJadibotIdentity(cloneNum).payment || {};
        return Reply(formatCard({
            icon: '💳',
            title: 'PENGATURAN PAYMENT CLONE',
            rows: [
                { label: 'Dana', value: toMono(pay.dana || '-') },
                { label: 'GoPay', value: toMono(pay.gopay || '-') },
                { label: 'Atas Nama', value: pay.an || '-' },
                { label: 'QRIS', value: pay.qris || '-' }
            ],
            body:
                `📌 *Cara Penggunaan:*\n` +
                `> 1. *Ganti Foto QRIS:* Kirim / reply foto dengan caption \`${usedPrefix}clonepay\`\n` +
                `> 2. *Ganti URL QRIS:* \`${usedPrefix}clonepay qris <url_gambar>\`\n` +
                `> 3. *Ganti Dana:* \`${usedPrefix}clonepay dana <nomor>\`\n` +
                `> 4. *Ganti GoPay:* \`${usedPrefix}clonepay gopay <nomor>\`\n` +
                `> 5. *Ganti Atas Nama:* \`${usedPrefix}clonepay an <nama>\``
        }));
    }
};
