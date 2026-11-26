const {
    formatCard,
    requireMainSetupAccess,
    updateSettingsImage,
    updateSettingsPayment,
    uploadImageToCdn,
    saveMainLocalMenuImage
} = require('./_helper');

module.exports = {
    name: 'setimage',
    category: 'setup',
    commands: ['setimage', 'setglobalimage', 'setimg'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, args, Reply, axios, uploadToCDN, usedPrefix } = ctx;

        const targetKey = (args[0] || '').toLowerCase().trim();
        const urlArg = args.slice(1).join(' ').trim();
        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);

        if (!['menu', 'qris', 'thumb', 'thumbnail'].includes(targetKey)) {
            const curImg = global._mainConfig?.image || global.image || {};
            return Reply(formatCard({
                icon: '🖼️',
                title: 'PENGATURAN GLOBAL IMAGE BOT UTAMA',
                rows: [
                    { label: 'image.menu', value: curImg.menu || '-' },
                    { label: 'image.qris', value: curImg.qris || '-' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> ◦ \`${usedPrefix}setimage menu <url>\` (atau reply foto)\n` +
                    `> ◦ \`${usedPrefix}setimage qris <url>\` (atau reply foto)`
            }));
        }

        const normalizedKey = (targetKey === 'thumb' || targetKey === 'thumbnail') ? 'menu' : targetKey;
        let finalUrl = '';
        let imgBuffer = null;

        if (isImg) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                imgBuffer = await qMsg.download();
                if (!imgBuffer) return Reply('❌ Gagal mengunduh gambar.');
                finalUrl = await uploadImageToCdn(imgBuffer, mimeType, uploadToCDN);
                if (!finalUrl) return Reply('❌ Gagal mengunggah gambar ke CDN.');
            } catch (e) {
                return Reply(`❌ Gagal memproses gambar: ${e.message}`);
            }
        } else if (/^https?:\/\//i.test(urlArg)) {
            finalUrl = urlArg;
        } else {
            return Reply(`📌 Kirim/reply foto dengan caption \`${usedPrefix}setimage ${normalizedKey}\` atau ketik \`${usedPrefix}setimage ${normalizedKey} https://url-gambar.jpg\``);
        }

        updateSettingsImage({ [normalizedKey]: finalUrl });
        if (normalizedKey === 'menu') {
            await saveMainLocalMenuImage(imgBuffer || finalUrl, axios);
        } else if (normalizedKey === 'qris') {
            updateSettingsPayment({ qris: finalUrl });
        }

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖼️',
            title: `GLOBAL IMAGE (${normalizedKey.toUpperCase()}) DIUBAH`,
            rows: [
                { label: 'Key', value: `global.image.${normalizedKey}` },
                { label: 'URL Baru', value: finalUrl },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
