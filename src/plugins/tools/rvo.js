const viewonceStore = require('../../services/viewonce-store');

module.exports = {
    name: 'rvo',
    category: 'tools',
    commands: ['rvo', 'readviewonce', 'readvo', 'buka', 'reveal'],

    async execute(ctx) {
        const { Dinz, m, store, command, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!m.quoted) {
            return Reply(
                `\`⌜ Read View Once (Auto-Fallback) ⌟\`\n` +
                `> ◦ *Format :* reply foto, video, VN, atau spoiler sekali lihat dengan *.${command}*\n` +
                `> ◦ *Support :* ViewOnce, ViewOnce V2/V2Ext, WA Business, Spoiler, dan buka ulang berkali-kali`
            );
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            const res = await viewonceStore.extractAndDownloadViewOnce(Dinz, m, store);
            if (!res) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(
                    `❌ Media View Once / Spoiler tidak ditemukan atau sudah terlalu lama/expired sebelum bot menerima pesannya.\n` +
                    `> 💡 Pastikan bot berada di chat/grup saat pesan sekali lihat dikirim agar media otomatis ter-backup untuk dibuka kapan saja.`
                );
            }

            const senderJid = res.sender || m.quoted.sender || '';
            const senderNum = senderJid ? senderJid.split('@')[0].split(':')[0] : '';
            const senderTag = senderNum ? `@${senderNum}` : 'Pengirim';
            const mentions = senderJid && senderNum ? [senderJid] : [];
            const captionTxt = res.caption || '';
            const infoCaption =
                `\`⌜ Read View Once ⌟\`\n` +
                `> ◦ *Dari :* ${senderTag}` +
                `${captionTxt ? `\n> ◦ *Caption :* ${captionTxt}` : ''}`;

            if (res.isText || res.mediaType === 'text') {
                await Dinz.sendMessage(m.chat, {
                    text: `${infoCaption}\n\n${res.caption || '(kosong)'}`,
                    mentions
                }, { quoted: m });
            } else if (res.mediaType === 'video' || /video/i.test(res.mimetype)) {
                await Dinz.sendMessage(m.chat, {
                    video: res.buffer,
                    caption: infoCaption,
                    mimetype: res.mimetype || 'video/mp4',
                    mentions
                }, { quoted: m });
            } else if (res.mediaType === 'audio' || /audio/i.test(res.mimetype)) {
                const isOpus = /ogg|opus/i.test(res.mimetype);
                await Dinz.sendMessage(m.chat, {
                    audio: res.buffer,
                    mimetype: isOpus ? 'audio/ogg; codecs=opus' : (res.mimetype || 'audio/ogg; codecs=opus'),
                    ptt: res.ptt !== false
                }, { quoted: m });
            } else if (res.mediaType === 'document') {
                await Dinz.sendMessage(m.chat, {
                    document: res.buffer,
                    mimetype: res.mimetype || 'application/octet-stream',
                    fileName: res.fileName || `viewonce_${Date.now()}`,
                    caption: infoCaption,
                    mentions
                }, { quoted: m });
            } else if (res.mediaType === 'sticker') {
                await Dinz.sendMessage(m.chat, { sticker: res.buffer }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, {
                    image: res.buffer,
                    caption: infoCaption,
                    mentions
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('RVO error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membaca View Once: ${err.message}`);
        }
        return true;
    }
};
