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
    name: 'cloneimage',
    category: 'cloner',
    commands: ['cloneimage', 'cloneglobalimage', 'cloneimg'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, args, Reply, axios, uploadToCDN, botCtx, jadibotMgr, usedPrefix } = ctx;

        const targetKey = (args[0] || '').toLowerCase().trim();
        const urlArg = args.slice(1).join(' ').trim();
        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isImg = /image/.test(mimeType);
        const prevId = botCtx.getJadibotIdentity(cloneNum);

        if (!['menu', 'qris', 'thumb', 'thumbnail'].includes(targetKey)) {
            return Reply(formatCard({
                icon: '🖼️',
                title: 'PENGATURAN IMAGE CLONE',
                rows: [
                    { label: 'image.menu', value: prevId.image?.menu || '-' },
                    { label: 'image.qris', value: prevId.image?.qris || '-' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> ◦ \`${usedPrefix}cloneimage menu <url>\` (atau reply foto)\n` +
                    `> ◦ \`${usedPrefix}cloneimage qris <url>\` (atau reply foto)`
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
                finalUrl = await uploadCloneImageToCdn(imgBuffer, mimeType, uploadToCDN);
                if (!finalUrl) return Reply('❌ Gagal mengunggah gambar ke CDN.');
            } catch (e) {
                return Reply(`❌ Gagal memproses gambar: ${e.message}`);
            }
        } else if (/^https?:\/\//i.test(urlArg)) {
            finalUrl = urlArg;
        } else {
            return Reply(`📌 Kirim/reply foto dengan caption \`${usedPrefix}cloneimage ${normalizedKey}\` atau ketik \`${usedPrefix}cloneimage ${normalizedKey} https://url-gambar.jpg\``);
        }

        const mediaDir = getCloneMediaDir(cloneNum, botCtx);
        clearCloneCaches(mediaDir, prevId.image?.menu);

        const patch = { image: { [normalizedKey]: finalUrl } };
        if (normalizedKey === 'qris') {
            patch.payment = { qris: finalUrl };
        }
        patchCloneConfig(cloneNum, patch, botCtx, jadibotMgr);

        if (normalizedKey === 'menu') {
            await saveCloneLocalMenuImage(cloneNum, imgBuffer || finalUrl, botCtx, axios);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖼️',
            title: `IMAGE CLONE (${normalizedKey.toUpperCase()}) DIUBAH`,
            rows: [
                { label: 'Key', value: `clone.image.${normalizedKey}` },
                { label: 'URL Baru', value: finalUrl },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
