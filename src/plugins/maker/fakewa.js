module.exports = {
    name: 'fakewa',
    category: 'maker',
    commands: ['fakewa', 'qwa'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, Reply, uploadToCDN, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mimeType = (q.msg || q).mimetype || '';
        const isImage = /image/.test(mimeType) || q.type === 'imageMessage';

        if (!isImage) {
            return Reply(`\`⌜ Fake WhatsApp ⌟\`\n> ◦ *Format :* reply foto dengan caption ${command} teks|nomor wa|nama`);
        }

        let defaultPhone = `+${(m.sender || '6281234567890').split('@')[0]}`;
        let username = m.pushName || 'User';
        let phone = defaultPhone;
        let chatText = 'Halo semuanya!';
        let replyUser = '';
        let replyText = '';
        let replyPhone = '';

        if (m.quoted && m.quoted.text && m.quoted.text !== text) {
            replyUser = m.quoted.pushName || m.quoted.sender?.split('@')[0] || 'User';
            replyText = m.quoted.text || m.quoted.caption || m.quoted.conversation || '';
            replyPhone = `+${(m.quoted.sender || '6281234567890').split('@')[0]}`;
        }

        if (text && text.trim().length > 0) {
            if (text.includes('|')) {
                const parts = text.split('|').map(s => s.trim());
                if (parts.length >= 3) {
                    username = parts[0];
                    phone = parts[1];
                    chatText = parts.slice(2).join('|');
                } else if (parts.length === 2) {
                    username = parts[0];
                    chatText = parts[1];
                }
            } else {
                chatText = text.trim();
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const imgBuf = await q.download();
            if (!imgBuf || imgBuf.length === 0) throw new Error("Gagal mengunduh foto yang di-reply.");

            const avatarUrl = await uploadToCDN(imgBuf, mimeType || 'image/jpeg');
            if (!avatarUrl) throw new Error("Gagal mengunggah foto ke server CDN.");

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            const params = {
                apikey: apiKey,
                image: avatarUrl,
                text: chatText,
                username: username,
                phone: phone
            };

            if (replyUser && replyText) {
                params.reply_user = replyUser;
                params.reply_text = replyText;
                params.reply_phone = replyPhone;
            }

            const res = await axios.get(`${baseUrl}/imagecreator/fakewa`, {
                params,
                responseType: 'arraybuffer',
                timeout: 45000
            });

            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(res.data),
                caption: `\`⌜ Fake WhatsApp Chat ⌟\`\n> ◦ *User :* ${username}\n> ◦ *Nomor :* ${phone}\n> ◦ *Pesan :* ${chatText}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('[FAKEWA ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat fake WA: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
