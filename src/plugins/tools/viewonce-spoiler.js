const { formatCard, toMono, toBoldSans, toSmallCaps } = require('../../utils/formatter');

module.exports = {
    name: 'viewonce-spoiler',
    category: 'tools',
    commands: [
        'viewonce', 'vo', 'lihatsekali',
        'viewoncev2', 'vov2',
        'viewoncev2ext', 'vov2ext', 'viewoncev2extension',
        'spoiler', 'blur'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, qmsg, mime, isCreator, Reply, prefixMgr, usedPrefix, checkLimit, addLimit } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;
        const cmd = String(command || '').toLowerCase();

        const isSpoiler = cmd === 'spoiler' || cmd === 'blur';
        const isV2Ext = cmd === 'viewoncev2ext' || cmd === 'vov2ext' || cmd === 'viewoncev2extension';
        const isV2 = cmd === 'viewoncev2' || cmd === 'vov2';

        const isImage = /image\/(?!webp)/i.test(mime) || m.type === 'imageMessage' || m.quoted?.type === 'imageMessage';
        const isVideo = /video/i.test(mime) || m.type === 'videoMessage' || m.quoted?.type === 'videoMessage';
        const isAudio = /audio/i.test(mime) || m.type === 'audioMessage' || m.quoted?.type === 'audioMessage';

        const captionText = (text || '').trim();

        if (!isImage && !isVideo && !isAudio) {
            if (isSpoiler && captionText) {
                if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
                await Dinz.sendMessage(m.chat, { text: captionText, spoiler: true }, { quoted: m });
                addLimit(m.sender, isCreator);
                return true;
            }
            const label = isSpoiler ? 'SPOILER MESSAGE' : isV2Ext ? 'VIEW ONCE V2 EXTENSION' : isV2 ? 'VIEW ONCE V2' : 'LIHAT SEKALI (VIEW ONCE)';
            return Reply(formatCard({
                icon: isSpoiler ? '❔' : '👁️',
                title: label,
                body:
                    `${toSmallCaps('kirim / reply foto, video, atau audio dengan command ini')}\n\n` +
                    `◦ ${toMono(`${pfx}viewonce [caption]`)} — bungkus ke *viewOnceMessage*\n` +
                    `◦ ${toMono(`${pfx}vov2 [caption]`)} — bungkus ke *viewOnceMessageV2*\n` +
                    `◦ ${toMono(`${pfx}vov2ext [caption]`)} — bungkus ke *viewOnceMessageV2Extension*\n` +
                    `◦ ${toMono(`${pfx}spoiler [caption]`)} — bungkus ke *spoilerMessage* (media/teks)`
            }));
        }

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            let mediaBuffer = null;
            if (typeof qmsg?.download === 'function') mediaBuffer = await qmsg.download();
            else if (typeof quoted?.download === 'function') mediaBuffer = await quoted.download();
            else if (typeof m.download === 'function') mediaBuffer = await m.download();
            else mediaBuffer = await Dinz.downloadMediaMessage(quoted || m);

            if (!mediaBuffer || !mediaBuffer.length) {
                throw new Error('Gagal mengunduh media dari pesan.');
            }

            const flag = isSpoiler
                ? { spoiler: true }
                : isV2Ext
                    ? { viewOnceV2Extension: true }
                    : isV2
                        ? { viewOnceV2: true }
                        : { viewOnce: true };

            const defaultCap = isSpoiler
                ? '❔ Spoiler'
                : isV2Ext
                    ? '👁️ View Once V2 Extension'
                    : isV2
                        ? '👁️ View Once V2'
                        : '👁️ Lihat Sekali';

            const payload = isImage
                ? { image: mediaBuffer, caption: captionText || defaultCap, ...flag }
                : isVideo
                    ? { video: mediaBuffer, caption: captionText || defaultCap, ...flag }
                    : { audio: mediaBuffer, mimetype: mime || 'audio/ogg; codecs=opus', ptt: true, ...flag };

            await Dinz.sendMessage(m.chat, payload, { quoted: m });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengirim pesan: ${err?.message || err}`);
        }
        return true;
    }
};
