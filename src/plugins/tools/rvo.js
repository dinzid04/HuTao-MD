const { downloadContentFromMessage } = require('./_helper');

module.exports = {
    name: 'rvo',
    category: 'tools',
    commands: ['rvo', 'readviewonce', 'readvo'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!m.quoted) {
            return Reply(`\`⌜ Read View Once ⌟\`\n> ◦ *Format :* reply pesan view once dengan ${command}`);
        }

        let qMessage = m.quoted.message || {};
        let targetMediaMsg = null;
        let targetMediaType = null;

        if (qMessage.viewOnceMessage?.message) {
            const inner = qMessage.viewOnceMessage.message;
            targetMediaType = Object.keys(inner)[0];
            targetMediaMsg = inner[targetMediaType];
        } else if (qMessage.viewOnceMessageV2?.message) {
            const inner = qMessage.viewOnceMessageV2.message;
            targetMediaType = Object.keys(inner)[0];
            targetMediaMsg = inner[targetMediaType];
        } else if (qMessage.viewOnceMessageV2Extension?.message) {
            const inner = qMessage.viewOnceMessageV2Extension.message;
            targetMediaType = Object.keys(inner)[0];
            targetMediaMsg = inner[targetMediaType];
        } else {
            targetMediaMsg = m.quoted.msg;
            targetMediaType = m.quoted.type;
        }

        if (!targetMediaMsg) {
            return Reply("❌ Media View Once tidak ditemukan pada pesan yang di-reply.");
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            let mediaTypeClean = (targetMediaType || '').replace('Message', '').toLowerCase();
            if (!mediaTypeClean) {
                if (/image/i.test(targetMediaMsg.mimetype)) mediaTypeClean = 'image';
                else if (/video/i.test(targetMediaMsg.mimetype)) mediaTypeClean = 'video';
                else if (/audio/i.test(targetMediaMsg.mimetype)) mediaTypeClean = 'audio';
            }

            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(targetMediaMsg, mediaTypeClean || 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                throw new Error("Gagal mengunduh isi media View Once.");
            }

            const captionTxt = targetMediaMsg.caption || m.quoted.text || '';
            const senderTag = m.quoted.sender ? `@${m.quoted.sender.split('@')[0]}` : 'Pengirim';
            const infoCaption = `\`⌜ Read View Once ⌟\`\n> ◦ *Dari :* ${senderTag}${captionTxt ? `\n> ◦ *Caption :* ${captionTxt}` : ''}`;

            if (mediaTypeClean === 'video' || /video/i.test(targetMediaMsg.mimetype)) {
                await Dinz.sendMessage(m.chat, {
                    video: buffer,
                    caption: infoCaption,
                    mimetype: 'video/mp4',
                    mentions: m.quoted.sender ? [m.quoted.sender] : []
                }, { quoted: m });
            } else if (mediaTypeClean === 'audio' || /audio/i.test(targetMediaMsg.mimetype)) {
                await Dinz.sendMessage(m.chat, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, {
                    image: buffer,
                    caption: infoCaption,
                    mentions: m.quoted.sender ? [m.quoted.sender] : []
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('RVO error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membaca View Once: ${err.message}`);
        }
        return true;
    }
};
