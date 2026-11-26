const {
    formatCard,
    requireMainSetupAccess,
    updateSettingsImage,
    uploadImageToCdn,
    saveMainLocalMenuImage
} = require('./_helper');

module.exports = {
    name: 'setthumb',
    category: 'setup',
    commands: ['setthumb', 'setthumbnail', 'setimgmenu', 'setimgbot'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, text, Reply, axios, uploadToCDN, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);

        let newImageUrl = '';
        let imgBuffer = null;

        if (isImg) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                imgBuffer = await qMsg.download();
                if (!imgBuffer) return Reply('❌ Gagal mengunduh gambar.');
                const cdnUrl = await uploadImageToCdn(imgBuffer, mimeType, uploadToCDN);
                if (!cdnUrl) {
                    return Reply('❌ Gagal mengunggah foto ke CDN. Coba lagi beberapa saat.');
                }
                newImageUrl = cdnUrl;
            } catch (err) {
                return Reply(`❌ Gagal memproses gambar: ${err.message}`);
            }
        } else if (text && /^https?:\/\//i.test(text.trim())) {
            newImageUrl = text.trim();
        } else {
            return Reply(formatCard({
                icon: '🖼️',
                title: 'SET THUMBNAIL / FOTO BOT UTAMA',
                rows: [
                    { label: 'Thumbnail Saat Ini', value: global._mainConfig?.image?.menu || global.image?.menu || '-' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> 1. Kirim / reply foto dengan caption \`${usedPrefix}setthumb\`\n` +
                    `> 2. Atau ketik: \`${usedPrefix}setthumb <url_gambar>\``
            }));
        }

        updateSettingsImage({ menu: newImageUrl });
        await saveMainLocalMenuImage(imgBuffer || newImageUrl, axios);

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖼️',
            title: 'THUMBNAIL BOT UTAMA DIUBAH',
            rows: [
                { label: 'URL Baru', value: newImageUrl },
                { label: 'File Lokal', value: 'assets/media/menu.jpg (Sinkron)' },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
