const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const chSender = require('../../services/channel-sender');

function buildHelpCard(pfx, savedCh) {
    const savedLine = savedCh?.id
        ? `> ◦ *CH Default Tersimpan :* ${savedCh.name} (\`${savedCh.id}\`)\n`
        : '';
    return (
        `\`📢 KIRIM KE SALURAN WHATSAPP (CHANNEL)\`\n` +
        `> ⚠️ *WAJIB:* Nomor bot *harus sudah menjadi Admin* di Saluran tujuan sebelum mengirim!\n` +
        `${savedLine}\n` +
        `*🎵 1. Kirim Audio / VN (2 Versi):*\n` +
        `> ◦ *Pilih Interaktif (bisa edit nama CH dulu):*\n` +
        `>   Reply audio/video ➔ \`${pfx}kirimch <link_ch>\`\n` +
        `> ◦ *Versi 1 (Audio Biasa / VN):*\n` +
        `>   Reply audio ➔ \`${pfx}kirimch biasa <link_ch>\`\n` +
        `> ◦ *Versi 2 (Audio Forward CH + Custom Nama CH):*\n` +
        `>   Reply audio ➔ \`${pfx}kirimch fwd <link_ch> | Nama CH Custom\`\n\n` +
        `*🎬 2. Kirim PTV / Video / Foto / Stiker / Dokumen / Teks:*\n` +
        `> ◦ *Video Bulat (PTV):* Reply video/PTV ➔ \`${pfx}kirimch ptv <link_ch>\`\n` +
        `> ◦ *Foto / Video / Dokumen:* Reply media ➔ \`${pfx}kirimch <link_ch> | caption\`\n` +
        `> ◦ *Teks Saja:* \`${pfx}kirimch <link_ch> | isi pengumuman\`\n\n` +
        `*⚙️ 3. Simpan CH Default (biar ga perlu paste link terus):*\n` +
        `> ◦ \`${pfx}kirimch setch <link_ch>\` • \`${pfx}kirimch delch\``
    );
}

async function sendAudioModePrompt({ Dinz, m, pfx, chInfo, botname, Reply }) {
    const bodyText =
        `\`🎵 PILIH VERSI KIRIM AUDIO KE CH\`\n` +
        `> ◦ *Tujuan CH :* ${chInfo.name}\n` +
        `> ◦ *ID CH :* \`${chInfo.id}\`\n` +
        `> ⚠️ *Pastikan bot sudah jadi Admin di saluran di atas!*\n\n` +
        `Pilih salah satu mode di bawah:\n` +
        `> 1. *Audio Biasa (VN)* — Kirim langsung tanpa label forward\n` +
        `> 2. *Audio Forward CH (Custom Nama)* — Edit nama CH yang tampil di header forward sebelum dikirim!`;

    try {
        const msg = await generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `📢 Channel Sender • ${botname}` }),
                        header: proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '🎵 Audio Biasa (VN)',
                                        id: `${pfx}kirimch _sendbiasa`
                                    })
                                },
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '📢 Forward CH (Edit Nama)',
                                        id: `${pfx}kirimch _askfwdname`
                                    })
                                },
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '❌ Batal',
                                        id: `${pfx}kirimch _cancel`
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: m });
        await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
        return true;
    } catch (_) {
        await Reply(
            `${bodyText}\n\n` +
            `📌 Balas dengan perintah:\n` +
            `> ◦ \`${pfx}kirimch _sendbiasa\` — kirim audio biasa\n` +
            `> ◦ \`${pfx}kirimch _askfwdname\` — edit nama CH forward\n` +
            `> ◦ \`${pfx}kirimch _cancel\` — batalkan`
        );
        return true;
    }
}

module.exports = {
    name: 'kirimch',
    category: 'owner',
    commands: ['kirimch', 'sendch', 'postch', 'chsend', 'upch', 'fwdch'],

    async execute(ctx) {
        const { Dinz, m, command, args, text, quoted, mime, isCreator, Reply, usedPrefix, botCtx, getSenderNumber } = ctx;
        const pfx = usedPrefix || '.';

        if (!isCreator) return Reply(global.mess.owner);

        const senderNum = getSenderNumber(m) || String(m.sender || '').split('@')[0];
        const cmd = String(command || '').toLowerCase();
        const sub = String(args[0] || '').trim().toLowerCase();
        const identity = botCtx?.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
        const botname = identity.botname || global.botname || 'HuTao - MD';

        // Handle internal callback buttons for interactive audio draft
        if (sub === '_cancel') {
            chSender.clearDraft(Dinz, m.chat, senderNum);
            return Reply('❌ Pengiriman audio ke saluran dibatalkan.');
        }

        if (sub === '_sendbiasa') {
            const draft = chSender.getDraft(Dinz, m.chat, senderNum);
            if (!draft || !draft.mediaPath || !fs.existsSync(draft.mediaPath)) {
                return Reply(`❌ Draft audio sudah kadaluarsa. Silakan reply audio lagi lalu ketik \`${pfx}kirimch <link_ch>\`.`);
            }
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const buf = fs.readFileSync(draft.mediaPath);
                await chSender.sendAudioToChannel(Dinz, draft.chInfo.id, buf, {
                    mode: 'biasa',
                    asFileMp3: draft.asFileMp3,
                    extHint: draft.extHint || 'mp3'
                });
                chSender.clearDraft(Dinz, m.chat, senderNum);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(
                    `\`✅ AUDIO BERHASIL DIKIRIM KE CH\`\n` +
                    `> ◦ *Saluran :* ${draft.chInfo.name}\n` +
                    `> ◦ *Versi :* Audio Biasa (${draft.asFileMp3 ? 'File MP3' : 'Voice Note'})\n` +
                    `> ◦ *ID CH :* \`${draft.chInfo.id}\``
                );
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal kirim audio biasa ke CH: ${err?.message || err}`);
            }
        }

        if (sub === '_askfwdname') {
            const draft = chSender.getDraft(Dinz, m.chat, senderNum);
            if (!draft || !draft.mediaPath || !fs.existsSync(draft.mediaPath)) {
                return Reply(`❌ Draft audio sudah kadaluarsa. Silakan reply audio lagi lalu ketik \`${pfx}kirimch <link_ch>\`.`);
            }
            chSender.saveDraft(Dinz, m.chat, senderNum, {
                ...draft,
                step: 'wait_ch_name',
                lastMsgId: m.key.id
            });
            return Reply(
                `\`✏️ EDIT NAMA CH FORWARD\`\n` +
                `> ◦ *Tujuan CH :* ${draft.chInfo.name}\n` +
                `> ◦ *Default Nama :* ${draft.chInfo.name}\n\n` +
                `📝 *Sekarang ketik Nama CH custom* yang mau ditampilkan di header forward audio (contoh: \`Playlist Galau 24/7\` atau \`HuTao Music Official\`).\n` +
                `_Ketik \`batal\` untuk membatalkan._`
            );
        }

        // Save / clear default channel
        if (sub === 'setch') {
            const target = chSender.extractChannelTarget(text);
            if (!target) return Reply(`📌 Contoh: \`${pfx}kirimch setch https://whatsapp.com/channel/0029Vb...\``);
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const info = await chSender.resolveChannelMetadata(Dinz, target);
                if (!global.db.settings) global.db.settings = {};
                global.db.settings.defaultChannel = { id: info.id, name: info.name };
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                const warnAdmin = info.isConfirmedNotAdmin
                    ? `\n⚠️ *Peringatan:* Status bot saat ini masih *${info.role}* (belum Admin). Jadikan nomor bot sebagai Admin di saluran ini agar bisa mengirim pesan!`
                    : `\n⚠️ *Pastikan nomor bot sudah menjadi Admin* di saluran ini sebelum mengirim pesan.`;
                return Reply(
                    `\`✅ CH DEFAULT DISIMPAN\`\n` +
                    `> ◦ *Nama CH :* ${info.name}\n` +
                    `> ◦ *ID CH :* \`${info.id}\`\n` +
                    `> ◦ *Role Bot :* ${info.role}${warnAdmin}`
                );
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ ${err?.message || err}`);
            }
        }

        if (sub === 'delch' || sub === 'resetch') {
            if (global.db?.settings?.defaultChannel) delete global.db.settings.defaultChannel;
            return Reply(`✅ Channel default telah dihapus.`);
        }

        const savedCh = global.db?.settings?.defaultChannel || null;

        // Parse input: optional mode + channel link + optional "| caption or customChName"
        const rawText = String(text || '').trim();
        const hasMediaAttached = Boolean(
            (m.quoted && (m.quoted.isMedia || /image|video|audio|webp|document|ptv/i.test(String(m.quoted.type || m.quoted.mime || '')))) ||
            (m.isMedia && /image|video|audio|webp|document|ptv/i.test(String(m.type || m.mime || '')))
        );

        if (!rawText && !hasMediaAttached) {
            return Reply(buildHelpCard(pfx, savedCh));
        }

        let leftPart = rawText;
        let rightPart = '';
        if (rawText.includes('|')) {
            const idx = rawText.indexOf('|');
            leftPart = rawText.slice(0, idx).trim();
            rightPart = rawText.slice(idx + 1).trim();
        }

        let chTarget = chSender.extractChannelTarget(leftPart) || chSender.extractChannelTarget(rightPart);
        let cleanedLeft = leftPart;
        if (chTarget) {
            cleanedLeft = leftPart.replace(chTarget.raw, ' ').trim();
            if (!leftPart.includes(chTarget.raw)) {
                rightPart = rightPart.replace(chTarget.raw, ' ').trim();
            }
        } else if (savedCh?.id) {
            chTarget = { raw: savedCh.id, type: 'jid', value: savedCh.id };
        }

        if (!chTarget) {
            return Reply(
                `❌ *Link Saluran (Channel) belum dimasukkan!*\n` +
                `> ⚠️ *Ingat:* Bot wajib sudah menjadi *Admin* di saluran tujuan.\n\n` +
                `${buildHelpCard(pfx, savedCh)}`
            );
        }

        // Detect flags in cleanedLeft
        const tokens = cleanedLeft.split(/\s+/).filter(Boolean);
        let explicitAudioMode = cmd === 'fwdch' ? 'forward' : '';
        let forcePtv = false;
        let asFileMp3 = false;
        let forceAudioExtract = false;
        const leftoverWords = [];

        for (const t of tokens) {
            const low = t.toLowerCase();
            if (['fwd', 'forward', 'ch', 'saluran'].includes(low)) {
                explicitAudioMode = 'forward';
            } else if (['biasa', 'normal', 'polos'].includes(low)) {
                explicitAudioMode = 'biasa';
            } else if (['ptv', 'bulat', 'videonote'].includes(low)) {
                forcePtv = true;
            } else if (['mp3', 'file'].includes(low)) {
                asFileMp3 = true;
            } else if (['audio', 'vn', 'sound'].includes(low)) {
                forceAudioExtract = true;
            } else {
                leftoverWords.push(t);
            }
        }

        const extraText = rightPart || leftoverWords.join(' ').trim();

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        let chInfo;
        try {
            chInfo = await chSender.resolveChannelMetadata(Dinz, chTarget);
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ ${err?.message || err}`);
        }

        if (chInfo.isConfirmedNotAdmin) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(
                `\`⚠️ BOT BELUM JADI ADMIN DI CH\`\n` +
                `> ◦ *Saluran :* ${chInfo.name}\n` +
                `> ◦ *Status Bot :* ${chInfo.role}\n\n` +
                `Silakan jadikan nomor bot sebagai *Admin* di saluran *${chInfo.name}* terlebih dahulu agar bot dapat mengirim pesan/media ke saluran tersebut!`
            );
        }

        // Determine source media (replied message or current message)
        const src = (m.quoted && (m.quoted.isMedia || /image|video|audio|webp|document|ptv/i.test(String(m.quoted.type || m.quoted.mime || ''))))
            ? m.quoted
            : (m.isMedia ? m : null);

        const srcType = String(src?.type || '').toLowerCase();
        const srcMime = String(src?.mime || mime || '').toLowerCase();

        // Text-only post to channel
        if (!src) {
            const postText = extraText || m.quoted?.text || m.quoted?.body || '';
            if (!postText) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Reply media (audio/PTV/video/foto/stiker/dokumen) atau sertakan teks setelah \`|\`!\n\n${buildHelpCard(pfx, savedCh)}`);
            }
            try {
                await Reply(`⏳ Mengirim teks ke saluran *${chInfo.name}*...\n_⚠️ Pastikan nomor bot sudah jadi Admin di saluran tersebut._`);
                await chSender.sendMediaOrTextToChannel(Dinz, chInfo.id, { kind: 'text', caption: postText });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(`✅ Teks berhasil dikirim ke saluran *${chInfo.name}*!`);
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal mengirim ke saluran *${chInfo.name}*: ${err?.message || err}\n\n⚠️ *Pastikan nomor bot sudah menjadi Admin di saluran tersebut!*`);
            }
        }

        // Download media buffer
        let mediaBuf;
        try {
            mediaBuf = typeof src.download === 'function' ? await src.download() : await Dinz.downloadMediaMessage(src);
            if (!Buffer.isBuffer(mediaBuf) || mediaBuf.length === 0) throw new Error('Media kosong.');
        } catch (dlErr) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengunduh media yang di-reply: ${dlErr?.message || dlErr}`);
        }

        const isAudio = srcType.includes('audio') || /^audio\//i.test(srcMime) || (forceAudioExtract && (srcType.includes('video') || /^video\//i.test(srcMime)));
        const isPtv = forcePtv || srcType === 'ptvmessage' || Boolean(src?.msg?.ptv);
        const isVideo = !isPtv && !isAudio && (srcType.includes('video') || /^video\//i.test(srcMime));
        const isImage = srcType.includes('image') || /^image\/(jpeg|jpg|png|gif)/i.test(srcMime);
        const isSticker = srcType.includes('sticker') || /webp/i.test(srcMime);
        const isDoc = srcType.includes('document');

        // AUDIO -> 2 VERSI (Biasa vs Forward CH Custom Nama!)
        if (isAudio) {
            const extHint = srcMime.includes('mp4') ? 'mp4' : (srcMime.includes('ogg') ? 'ogg' : 'mp3');

            // Jika belum menentukan biasa/fwd -> simpan draft & tampilkan tombol pilihan + edit nama CH!
            if (!explicitAudioMode) {
                chSender.ensureTmpDir();
                const tmpPath = path.join(chSender.TMP_DIR, `draft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extHint}`);
                fs.writeFileSync(tmpPath, mediaBuf);
                chSender.saveDraft(Dinz, m.chat, senderNum, {
                    step: 'choose_mode',
                    chInfo,
                    mediaPath: tmpPath,
                    extHint,
                    asFileMp3,
                    lastMsgId: m.key.id
                });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return sendAudioModePrompt({ Dinz, m, pfx, chInfo, botname, Reply });
            }

            // Jika explicit forward tapi belum ada custom nama CH -> minta ketik nama CH custom dulu!
            if (explicitAudioMode === 'forward' && !extraText) {
                chSender.ensureTmpDir();
                const tmpPath = path.join(chSender.TMP_DIR, `draft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extHint}`);
                fs.writeFileSync(tmpPath, mediaBuf);
                chSender.saveDraft(Dinz, m.chat, senderNum, {
                    step: 'wait_ch_name',
                    chInfo,
                    mediaPath: tmpPath,
                    extHint,
                    asFileMp3,
                    lastMsgId: m.key.id
                });
                await Dinz.sendMessage(m.chat, { react: { text: '✏️', key: m.key } }).catch(() => {});
                return Reply(
                    `\`✏️ EDIT NAMA CH FORWARD\`\n` +
                    `> ◦ *Tujuan CH :* ${chInfo.name}\n` +
                    `> ⚠️ *Pastikan bot sudah menjadi Admin di saluran tujuan!*\n\n` +
                    `📝 *Ketik Nama CH custom* yang mau ditampilkan di header forward audio (contoh: \`HuTao Music Official\`).\n` +
                    `_Ketik \`batal\` untuk membatalkan._`
                );
            }

            // Langsung kirim audio (biasa atau forward dengan custom nama CH!)
            try {
                await Reply(
                    `⏳ Mengirim audio (${explicitAudioMode === 'forward' ? `Forward CH: *${extraText}*` : 'Audio Biasa'}) ke saluran *${chInfo.name}*...\n` +
                    `_⚠️ Pastikan nomor bot sudah jadi Admin di saluran tersebut._`
                );
                await chSender.sendAudioToChannel(Dinz, chInfo.id, mediaBuf, {
                    mode: explicitAudioMode,
                    customChName: extraText || chInfo.name,
                    asFileMp3,
                    extHint
                });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(
                    `\`✅ AUDIO BERHASIL DIKIRIM KE CH\`\n` +
                    `> ◦ *Saluran :* ${chInfo.name}\n` +
                    `> ◦ *Versi :* ${explicitAudioMode === 'forward' ? `Forward CH (Nama: *${extraText}*)` : 'Audio Biasa'}\n` +
                    `> ◦ *Format :* ${asFileMp3 ? 'Audio MP3' : 'Voice Note (Opus)'}`
                );
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal kirim audio ke saluran *${chInfo.name}*: ${err?.message || err}\n\n⚠️ *Pastikan nomor bot sudah menjadi Admin di saluran tersebut!*`);
            }
        }

        // MEDIA LAINNYA (PTV, Video, Image, Sticker, Document)
        const mediaKind = isPtv ? 'ptv' : isVideo ? 'video' : isImage ? 'image' : isSticker ? 'sticker' : isDoc ? 'document' : 'document';
        const kindLabels = { ptv: 'PTV (Video Bulat)', video: 'Video', image: 'Gambar/Foto', sticker: 'Stiker', document: 'Dokumen' };
        const fallbackCaption = extraText || (src !== m ? (src.text || src.msg?.caption || '') : '');
        const docFileName = src?.msg?.fileName || `file_${Date.now()}`;

        try {
            await Reply(`⏳ Mengirim *${kindLabels[mediaKind]}* ke saluran *${chInfo.name}*...\n_⚠️ Pastikan nomor bot sudah jadi Admin di saluran tersebut._`);
            await chSender.sendMediaOrTextToChannel(Dinz, chInfo.id, {
                kind: mediaKind,
                buffer: mediaBuf,
                caption: fallbackCaption,
                mimetype: srcMime,
                fileName: docFileName
            });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                `\`✅ BERHASIL DIKIRIM KE CH\`\n` +
                `> ◦ *Saluran :* ${chInfo.name}\n` +
                `> ◦ *Tipe :* ${kindLabels[mediaKind]}\n` +
                `> ◦ *ID CH :* \`${chInfo.id}\``
            );
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal kirim ${kindLabels[mediaKind]} ke saluran *${chInfo.name}*: ${err?.message || err}\n\n⚠️ *Pastikan nomor bot sudah menjadi Admin di saluran tersebut!*`);
        }
    }
};
