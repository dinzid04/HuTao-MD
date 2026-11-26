const {
    formatCard,
    requireClonerOwner,
    getCloneMediaDir,
    clearCloneCaches,
    patchCloneConfig,
    uploadCloneImageToCdn,
    saveCloneLocalMenuImage
} = require('./_helper');

module.exports = {
    name: 'clonethumb',
    category: 'cloner',
    commands: ['clonethumb', 'clonethumbnail', 'cloneimgmenu', 'cloneimgbot'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, text, Reply, axios, uploadToCDN, botCtx, jadibotMgr, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);
        const prevId = botCtx.getJadibotIdentity(cloneNum);

        let newUrl = '';
        let imgBuffer = null;

        if (isImg) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                imgBuffer = await qMsg.download();
                if (!imgBuffer) return Reply('❌ Gagal mengunduh gambar.');
                const cdnUrl = await uploadCloneImageToCdn(imgBuffer, mimeType, uploadToCDN);
                if (!cdnUrl) {
                    await saveCloneLocalMenuImage(cloneNum, imgBuffer, botCtx, axios);
                    return Reply(formatCard({
                        icon: '🖼️',
                        title: 'THUMBNAIL CLONE DISIMPAN LOKAL',
                        rows: [
                            { label: 'Penyimpanan', value: `data/jadibot-media/${cloneNum}/media/menu.jpg` },
                            { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                        ]
                    }));
                }
                newUrl = cdnUrl;
            } catch (err) {
                return Reply(`❌ Gagal memproses gambar: ${err.message}`);
            }
        } else if (text && /^https?:\/\//i.test(text.trim())) {
            newUrl = text.trim();
        } else {
            return Reply(formatCard({
                icon: '🖼️',
                title: 'SET THUMBNAIL / FOTO BOT CLONE',
                rows: [
                    { label: 'Thumbnail Saat Ini', value: prevId.image?.menu || '-' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> 1. Kirim / reply foto dengan caption \`${usedPrefix}clonethumb\`\n` +
                    `> 2. Atau ketik: \`${usedPrefix}clonethumb <url_gambar>\``
            }));
        }

        const mediaDir = getCloneMediaDir(cloneNum, botCtx);
        clearCloneCaches(mediaDir, prevId.image?.menu);
        patchCloneConfig(cloneNum, { image: { menu: newUrl } }, botCtx, jadibotMgr);
        await saveCloneLocalMenuImage(cloneNum, imgBuffer || newUrl, botCtx, axios);

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖼️',
            title: 'THUMBNAIL BOT CLONE DIUBAH',
            rows: [
                { label: 'URL Baru', value: newUrl },
                { label: 'Folder Media', value: `data/jadibot-media/${cloneNum}/media/menu.jpg` },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
