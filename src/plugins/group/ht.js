module.exports = {
    name: 'ht',
    category: 'group',
    commands: ['ht', 'h', 'hidetag'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, validCommands } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        const members = m.metadata.participants.map(v => v.id);

        const cleanText = (input) => {
            if (!input) return '';
            let txt = input.trim();
            const regex = new RegExp('^(h|ht|hidetag)\\s*', 'i');
            return txt.replace(regex, '').trim();
        };

        let mediaBuffer = null;
        let mimeType = '';
        let captionText = '';

        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

        if (m.message?.imageMessage) {
            try {
                const mediaStream = await downloadContentFromMessage(m.message.imageMessage, 'image');
                const chunks = [];
                for await (const chunk of mediaStream) chunks.push(chunk);
                mediaBuffer = Buffer.concat(chunks);
                mimeType = m.message.imageMessage.mimetype;
                captionText = cleanText(m.message.imageMessage.caption || text || '');
            } catch (e) {}
        } else if (m.message?.videoMessage) {
            try {
                const mediaStream = await downloadContentFromMessage(m.message.videoMessage, 'video');
                const chunks = [];
                for await (const chunk of mediaStream) chunks.push(chunk);
                mediaBuffer = Buffer.concat(chunks);
                mimeType = m.message.videoMessage.mimetype;
                captionText = cleanText(m.message.videoMessage.caption || text || '');
            } catch (e) {}
        }

        const quotedMsg = m.quoted;
        if (quotedMsg) {
            const qObj = quotedMsg.msg || quotedMsg;
            const quotedMime = qObj.mimetype || '';

            if (/image|video/gi.test(quotedMime)) {
                try {
                    const mediaStream = await downloadContentFromMessage(
                        qObj,
                        quotedMime.includes('image') ? 'image' : 'video'
                    );
                    const chunks = [];
                    for await (const chunk of mediaStream) chunks.push(chunk);
                    mediaBuffer = Buffer.concat(chunks);
                    mimeType = quotedMime;
                    captionText = cleanText(qObj.caption || quotedMsg.text || quotedMsg.body || text || '');
                } catch (e) {}
            } else if (quotedMsg.text || quotedMsg.body) {
                captionText = cleanText(quotedMsg.text || quotedMsg.body || text || '');
            }
        }

        if (!captionText && !mediaBuffer) {
            captionText = cleanText(text || '');
        }

        if (captionText) {
            const firstWord = captionText.split(/ +/)[0].toLowerCase();
            const isCmdText = validCommands.includes(firstWord);
            if (isCmdText) return Reply("❌ Izin ditolak! Demi keamanan, tidak diperbolehkan melakukan hidetag pada pesan yang berupa perintah.");
        }

        if (mediaBuffer) {
            let messageOptions = {
                caption: captionText,
                mentions: members
            };

            if (mimeType.includes('image')) {
                messageOptions.image = mediaBuffer;
            } else if (mimeType.includes('video')) {
                messageOptions.video = mediaBuffer;
            }

            await Dinz.sendMessage(m.chat, messageOptions, { quoted: m });
        } else if (captionText) {
            await Dinz.sendMessage(m.chat, {
                text: captionText,
                mentions: members
            }, { quoted: m });
        } else {
            return Reply("📌 Masukkan teks, atau kirim/reply ke pesan/foto/video yang ingin di-hidetag.");
        }
        return true;
    }
};
