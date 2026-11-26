const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const DEFAULT_LOTTIE_STICKER = {
    url: 'https://mmg.whatsapp.net/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0&mms3=true',
    fileSha256: 'Uoa2mnXeustnlPHuKU4SBDRzKn/Tfi7Yn8zDAbYCnos=',
    fileEncSha256: 'L2lSGKLAk7SXkVhBHuNwy2gyET1OhAcR8O7hTmFx0Ss=',
    mediaKey: 'rsI+FYArjYdzSdlGH4R6G5OUviYNZmBrFvoAitAlI7U=',
    mimetype: 'application/was',
    directPath: '/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0',
    isLottie: true
};

function toBase64IfBuf(val) {
    if (!val) return undefined;
    if (Buffer.isBuffer(val) || val instanceof Uint8Array) return Buffer.from(val).toString('base64');
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && Array.isArray(val.data)) return Buffer.from(val.data).toString('base64');
    return undefined;
}

function extractStickerPayload(rawMsg) {
    if (!rawMsg || typeof rawMsg !== 'object') return null;
    const s = rawMsg.stickerMessage || rawMsg;
    if (!s || (!s.url && !s.directPath)) return null;
    const out = {
        url: s.url,
        fileSha256: toBase64IfBuf(s.fileSha256),
        fileEncSha256: toBase64IfBuf(s.fileEncSha256),
        mediaKey: toBase64IfBuf(s.mediaKey),
        mimetype: s.mimetype || 'image/webp',
        directPath: s.directPath
    };
    if (s.isLottie) out.isLottie = true;
    if (s.isAnimated) out.isAnimated = true;
    return out;
}

function buildParentKey(m) {
    if (m.quoted) {
        const qKey = m.quoted.key || {};
        const key = {
            remoteJid: qKey.remoteJid || m.chat,
            id: qKey.id || m.quoted.id,
            fromMe: Boolean(qKey.fromMe || m.quoted.fromMe)
        };
        if (m.isGroup) {
            const part = qKey.participant || m.quoted.sender;
            if (part) key.participant = part;
        }
        return key;
    }
    return m.key;
}

module.exports = {
    name: 'sreact',
    category: 'sticker',
    commands: ['sreact', 'stickerreact', 'reactsticker'],

    async execute(ctx) {
        const { Dinz, m, args, quoted, mime, qmsg, isCreator, Reply, botCtx, checkLimit, addLimit, usedPrefix } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const sub = (args[0] || '').toLowerCase();

        if (sub === 'help' || sub === 'info') {
            return Reply(
                `\`⌜ Sticker Reaction ⌟\`\n` +
                `> ◦ \`${usedPrefix}sreact\` *(reply pesan)* — kirim sticker reaction\n` +
                `> ◦ \`${usedPrefix}sreact default\` *(reply pesan)* — pakai stiker Lottie bawaan\n` +
                `> ◦ \`${usedPrefix}sreact set\` *(Owner, reply stiker)* — ubah stiker default bot\n` +
                `> ◦ \`${usedPrefix}sreact reset\` *(Owner)* — kembalikan ke stiker Lottie bawaan`
            );
        }

        if (sub === 'reset') {
            if (!isCreator) return Reply(global.mess.owner);
            botCtx.setSection('sreact_custom', {}, Dinz);
            return Reply('✅ Sticker reaction dikembalikan ke stiker Lottie bawaan.');
        }

        if (sub === 'set') {
            if (!isCreator) return Reply(global.mess.owner);
            const rawSticker = m.quoted?.msg?.stickerMessage || (m.quoted?.type === 'stickerMessage' ? m.quoted.msg : null) || quoted?.stickerMessage;
            let stickerPayload = extractStickerPayload(rawSticker);

            if (!stickerPayload && /webp|sticker/i.test(mime)) {
                try {
                    const buf = typeof qmsg?.download === 'function'
                        ? await qmsg.download()
                        : await Dinz.downloadMediaMessage(quoted || m);
                    if (buf && buf.length && typeof prepareWAMessageMedia === 'function' && Dinz.waUploadToServer) {
                        const uploaded = await prepareWAMessageMedia({ sticker: buf }, { upload: Dinz.waUploadToServer });
                        stickerPayload = extractStickerPayload(uploaded);
                    }
                } catch (_) {}
            }

            if (!stickerPayload) {
                return Reply(`❌ Reply sebuah *stiker* lalu ketik \`${usedPrefix}sreact set\` untuk menyimpannya sebagai sticker reaction.`);
            }

            botCtx.setSection('sreact_custom', stickerPayload, Dinz);
            return Reply('✅ Stiker custom untuk *Sticker Reaction* berhasil disimpan!');
        }

        let stickerPayload = DEFAULT_LOTTIE_STICKER;
        if (sub !== 'default') {
            if (sub === 'self' && m.quoted?.type === 'stickerMessage') {
                const selfSt = extractStickerPayload(m.quoted.msg);
                if (selfSt) stickerPayload = selfSt;
            } else {
                const saved = botCtx.getSection('sreact_custom', Dinz);
                if (saved && (saved.url || saved.directPath)) {
                    stickerPayload = saved;
                }
            }
        }

        const parentMessageKey = buildParentKey(m);
        if (!parentMessageKey || !parentMessageKey.id) {
            return Reply(`❌ Reply pesan yang ingin diberi sticker reaction lalu ketik \`${usedPrefix}sreact\`.`);
        }

        try {
            await Dinz.relayMessage(
                m.chat,
                {
                    messageContextInfo: {
                        messageAssociation: {
                            associationType: 11,
                            parentMessageKey
                        }
                    },
                    stickerMessage: stickerPayload
                },
                {}
            );
            addLimit(m.sender, isCreator);
        } catch (err) {
            console.error('[sreact error]:', err?.message || err);
            return Reply(`❌ Gagal mengirim sticker reaction: ${err?.message || err}`);
        }
        return true;
    }
};
