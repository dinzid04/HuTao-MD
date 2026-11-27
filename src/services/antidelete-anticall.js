const moment = require('moment-timezone');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const botCtx = require('../core/context');

// Cache ringan khusus AntiDelete: hanya aktif jika antidelete ON, TIDAK menyimpan Buffer media di RAM!
const MAX_CACHE_ITEMS = 350;
const MSG_TTL_MS = 2 * 60 * 60 * 1000; // 2 jam
const msgCache = new Map(); // key: `${botKey}:${chatJid}:${msgId}`
const processedRevokes = new Map(); // dedup agar tidak kirim 2x ke owner
const processedCalls = new Map();

function getBotKey(Dinz) {
    return Dinz?.isJadibot && Dinz?.jadibotNumber ? `jb_${Dinz.jadibotNumber}` : 'main';
}

function getOwnerJidForBot(Dinz) {
    const id = botCtx.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
    const num = String(id.owner || global.owner || '').replace(/[^0-9]/g, '');
    return num ? `${num}@s.whatsapp.net` : '';
}

function pruneCaches() {
    const now = Date.now();
    for (const [k, v] of msgCache.entries()) {
        if (now - v.ts > MSG_TTL_MS) msgCache.delete(k);
    }
    while (msgCache.size > MAX_CACHE_ITEMS) {
        const oldest = msgCache.keys().next().value;
        msgCache.delete(oldest);
    }
    for (const [k, ts] of processedRevokes.entries()) {
        if (now - ts > 10 * 60 * 1000) processedRevokes.delete(k);
    }
    for (const [k, ts] of processedCalls.entries()) {
        if (now - ts > 2 * 60 * 1000) processedCalls.delete(k);
    }
}

setInterval(pruneCaches, 5 * 60 * 1000).unref?.();

function isAntiDeleteEnabled(Dinz) {
    const target = botCtx.getTargetBotData ? botCtx.getTargetBotData(Dinz) : global.db;
    return target?.settings?.antidelete === true;
}

function getAntiCallMode(Dinz) {
    const target = botCtx.getTargetBotData ? botCtx.getTargetBotData(Dinz) : global.db;
    const raw = target?.settings?.anticall;
    if (raw === 'block') return 'block';
    if (raw === true || raw === 'on' || raw === 'reject') return 'reject';
    return 'off';
}

function unwrapContent(rawMessage) {
    let cur = rawMessage;
    for (let i = 0; i < 5 && cur && typeof cur === 'object'; i++) {
        if (cur.ephemeralMessage?.message) cur = cur.ephemeralMessage.message;
        else if (cur.viewOnceMessage?.message) cur = cur.viewOnceMessage.message;
        else if (cur.viewOnceMessageV2?.message) cur = cur.viewOnceMessageV2.message;
        else if (cur.viewOnceMessageV2Extension?.message) cur = cur.viewOnceMessageV2Extension.message;
        else if (cur.documentWithCaptionMessage?.message) cur = cur.documentWithCaptionMessage.message;
        else break;
    }
    return cur;
}

function recordIncomingForAntiDelete(Dinz, m, rawWebMsg) {
    if (!isAntiDeleteEnabled(Dinz)) return;
    if (!m || !m.chat || !m.id || m.key?.fromMe) return;
    if (m.chat === 'status@broadcast' || m.chat.endsWith('@newsletter')) return;

    const inner = unwrapContent(rawWebMsg?.message || m.message);
    if (!inner || inner.protocolMessage || inner.reactionMessage) return;

    let kind = 'Teks';
    let dlType = '';
    let mediaNode = null;
    let text = m.body || m.text || '';

    if (inner.imageMessage) {
        kind = 'Foto'; dlType = 'image'; mediaNode = inner.imageMessage;
        text = inner.imageMessage.caption || text;
    } else if (inner.videoMessage) {
        kind = inner.videoMessage.ptv ? 'Video Note (PTV)' : 'Video';
        dlType = 'video'; mediaNode = inner.videoMessage;
        text = inner.videoMessage.caption || text;
    } else if (inner.audioMessage) {
        kind = inner.audioMessage.ptt ? 'Voice Note (VN)' : 'Audio';
        dlType = 'audio'; mediaNode = inner.audioMessage;
    } else if (inner.stickerMessage) {
        kind = 'Stiker'; dlType = 'sticker'; mediaNode = inner.stickerMessage;
    } else if (inner.documentMessage) {
        kind = `Dokumen (${inner.documentMessage.fileName || 'file'})`;
        dlType = 'document'; mediaNode = inner.documentMessage;
        text = inner.documentMessage.caption || text;
    } else if (!text) {
        return;
    }

    // Simpan hanya metadata ringan (tanpa buffer) agar hemat RAM
    let slimMedia = null;
    if (mediaNode && (mediaNode.mediaKey || mediaNode.url || mediaNode.directPath)) {
        slimMedia = {
            url: mediaNode.url,
            directPath: mediaNode.directPath,
            mediaKey: mediaNode.mediaKey,
            fileEncSha256: mediaNode.fileEncSha256,
            fileSha256: mediaNode.fileSha256,
            mimetype: mediaNode.mimetype || '',
            fileName: mediaNode.fileName || '',
            ptt: Boolean(mediaNode.ptt),
            ptv: Boolean(mediaNode.ptv)
        };
    }

    const cacheKey = `${getBotKey(Dinz)}:${m.chat}:${m.id}`;
    msgCache.set(cacheKey, {
        sender: m.sender || rawWebMsg?.key?.participant || m.chat,
        pushName: m.pushName || global.db?.users?.[m.sender]?.name || 'Tanpa Nama',
        chat: m.chat,
        isGroup: Boolean(m.isGroup || m.chat.endsWith('@g.us')),
        groupName: m.metadata?.subject || '',
        kind,
        dlType,
        text: String(text || '').slice(0, 2000),
        slimMedia,
        ts: Date.now()
    });
    if (msgCache.size > MAX_CACHE_ITEMS) {
        msgCache.delete(msgCache.keys().next().value);
    }
}

async function downloadDeletedMedia(entry) {
    if (!entry?.slimMedia || !entry.dlType) return null;
    try {
        const node = { ...entry.slimMedia };
        if (!node.url && node.directPath) {
            node.url = `https://mmg.whatsapp.net${node.directPath.startsWith('/') ? '' : '/'}${node.directPath}`;
        }
        const stream = await downloadContentFromMessage(node, entry.dlType);
        const chunks = [];
        for await (const ch of stream) chunks.push(ch);
        const buf = Buffer.concat(chunks);
        return buf.length > 0 ? buf : null;
    } catch (_) {
        return null;
    }
}

async function notifyDeletedMessage(Dinz, { chatJid, targetMsgId, deleterJid, deleterName }) {
    if (!isAntiDeleteEnabled(Dinz)) return false;
    if (!chatJid || !targetMsgId) return false;

    const botKey = getBotKey(Dinz);
    const dedupKey = `${botKey}:${chatJid}:${targetMsgId}`;
    if (processedRevokes.has(dedupKey)) return false;
    processedRevokes.set(dedupKey, Date.now());

    const entry = msgCache.get(dedupKey);
    if (!entry) return false;
    msgCache.delete(dedupKey);

    const ownerJid = getOwnerJidForBot(Dinz);
    if (!ownerJid) return false;

    const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
    const timeStr = moment().tz(tz).format('DD/MM/YYYY HH:mm:ss [WIB]');
    const actorJid = deleterJid || entry.sender;
    const actorNum = String(actorJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const senderNum = String(entry.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const contactName = deleterName || entry.pushName || global.db?.users?.[entry.sender]?.name || (Dinz.getName ? await Dinz.getName(entry.sender).catch(() => '') : '') || 'Tanpa Nama';

    let groupSubject = entry.groupName;
    if (entry.isGroup && !groupSubject) {
        try {
            const meta = Dinz.safeGroupMetadata ? await Dinz.safeGroupMetadata(chatJid) : await Dinz.groupMetadata(chatJid);
            groupSubject = meta?.subject || chatJid;
        } catch (_) {
            groupSubject = chatJid;
        }
    }

    const mentions = [...new Set([entry.sender, actorJid].filter((j) => j && j.endsWith('@s.whatsapp.net')))];
    let caption = '';

    if (entry.isGroup) {
        caption =
            `\`🗑️ ANTI-DELETE (GRUP)\`\n` +
            `> ◦ *Nama Grup :* ${groupSubject}\n` +
            `> ◦ *Pengirim :* @${senderNum} (${entry.pushName || contactName})\n` +
            (actorNum && actorNum !== senderNum ? `> ◦ *Dihapus Oleh :* @${actorNum} *(Admin)*\n` : '') +
            `> ◦ *Kontak :* https://wa.me/${senderNum}\n` +
            `> ◦ *Tipe Pesan :* ${entry.kind}\n` +
            `> ◦ *Waktu Hapus :* ${timeStr}` +
            (entry.text ? `\n\n💬 *Isi Pesan:*\n${entry.text}` : '');
    } else {
        caption =
            `\`🗑️ ANTI-DELETE (PRIVATE CHAT)\`\n` +
            `> ◦ *Nama Kontak :* ${contactName}\n` +
            `> ◦ *Nomor :* @${senderNum} (https://wa.me/${senderNum})\n` +
            `> ◦ *Tipe Pesan :* ${entry.kind}\n` +
            `> ◦ *Waktu Hapus :* ${timeStr}` +
            (entry.text ? `\n\n💬 *Isi Pesan:*\n${entry.text}` : '');
    }

    const mediaBuf = await downloadDeletedMedia(entry);
    try {
        if (mediaBuf) {
            if (entry.dlType === 'image') {
                await Dinz.sendMessage(ownerJid, { image: mediaBuf, caption, mentions });
                return true;
            }
            if (entry.dlType === 'video') {
                await Dinz.sendMessage(ownerJid, { video: mediaBuf, caption, mentions });
                return true;
            }
            if (entry.dlType === 'sticker') {
                await Dinz.sendMessage(ownerJid, { text: caption, mentions });
                await Dinz.sendMessage(ownerJid, { sticker: mediaBuf });
                return true;
            }
            if (entry.dlType === 'audio') {
                await Dinz.sendMessage(ownerJid, { text: caption, mentions });
                await Dinz.sendMessage(ownerJid, {
                    audio: mediaBuf,
                    mimetype: entry.slimMedia?.ptt ? 'audio/ogg; codecs=opus' : (entry.slimMedia?.mimetype || 'audio/mpeg'),
                    ptt: Boolean(entry.slimMedia?.ptt)
                });
                return true;
            }
            if (entry.dlType === 'document') {
                await Dinz.sendMessage(ownerJid, {
                    document: mediaBuf,
                    mimetype: entry.slimMedia?.mimetype || 'application/octet-stream',
                    fileName: entry.slimMedia?.fileName || 'deleted_file',
                    caption,
                    mentions
                });
                return true;
            }
        }
        await Dinz.sendMessage(ownerJid, { text: caption, mentions });
        return true;
    } catch (_) {
        return false;
    }
}

async function checkProtocolRevokeOnUpsert(Dinz, rawWebMsg, m) {
    if (!isAntiDeleteEnabled(Dinz)) return false;
    const protoMsg = rawWebMsg?.message?.protocolMessage || rawWebMsg?.message?.ephemeralMessage?.message?.protocolMessage;
    if (!protoMsg) return false;
    const isRevoke = protoMsg.type === 0 || protoMsg.type === 'REVOKE';
    if (!isRevoke || !protoMsg.key?.id) return false;

    const chatJid = protoMsg.key.remoteJid || rawWebMsg.key?.remoteJid || m?.chat;
    const deleterJid = m?.sender || rawWebMsg.key?.participant || rawWebMsg.key?.remoteJid;
    return notifyDeletedMessage(Dinz, {
        chatJid,
        targetMsgId: protoMsg.key.id,
        deleterJid,
        deleterName: m?.pushName || ''
    });
}

async function handleMessagesUpdateForAntiDelete(Dinz, updates) {
    if (!isAntiDeleteEnabled(Dinz) || !Array.isArray(updates)) return;
    for (const u of updates) {
        try {
            const protoMsg = u?.update?.message?.protocolMessage;
            const isStubRevoke = u?.update?.messageStubType === 1 || u?.update?.messageStubType === 'REVOKE';
            const isProtoRevoke = protoMsg && (protoMsg.type === 0 || protoMsg.type === 'REVOKE');
            if (!isStubRevoke && !isProtoRevoke) continue;

            const chatJid = u.key?.remoteJid;
            const targetMsgId = protoMsg?.key?.id || u.key?.id;
            const deleterJid = u.key?.participant || protoMsg?.key?.participant || chatJid;
            await notifyDeletedMessage(Dinz, { chatJid, targetMsgId, deleterJid, deleterName: '' });
        } catch (_) {}
    }
}

async function handleIncomingCalls(Dinz, calls) {
    const mode = getAntiCallMode(Dinz);
    if (mode === 'off' || !Array.isArray(calls)) return;

    const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
    const ownerJid = getOwnerJidForBot(Dinz);

    for (const call of calls) {
        try {
            if (!call || call.status !== 'offer') continue;
            const callKey = `${getBotKey(Dinz)}:${call.id}`;
            if (processedCalls.has(callKey)) continue;
            processedCalls.set(callKey, Date.now());

            const callerRaw = call.from || call.chatId || '';
            if (!callerRaw) continue;
            const callerJid = Dinz.decodeJid ? Dinz.decodeJid(callerRaw) : callerRaw;
            const callerNum = String(callerJid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const isVideo = Boolean(call.isVideo);
            const isGroupCall = Boolean(call.isGroup);
            const callKind = isVideo
                ? (isGroupCall ? '📹 Video Call Grup' : '📹 Video Call')
                : (isGroupCall ? '📞 Telepon Suara Grup' : '📞 Telepon Suara (Biasa)');

            // 1. Tolak panggilan (baik suara maupun video!)
            if (typeof Dinz.rejectCall === 'function') {
                await Dinz.rejectCall(call.id, call.from).catch(() => {});
            }

            // 2. Peringatan ke penelpon
            const warnText =
                `\`📵 ANTI-CALL AKTIF\`\n` +
                `> ◦ *Jenis :* ${callKind}\n` +
                `> ◦ *Status :* Panggilan otomatis ditolak${mode === 'block' ? ' & nomor diblokir' : ''}!\n\n` +
                `⚠️ Mohon tidak menelpon (suara maupun video) ke nomor bot. Gunakan chat teks saja.`;

            if (!callerJid.endsWith('@g.us')) {
                await Dinz.sendMessage(callerJid, { text: warnText }).catch(() => {});
            }

            // 3. Jika mode block, blokir penelpon (kecuali owner sendiri!)
            const ownerNum = String(ownerJid).split('@')[0];
            let blocked = false;
            if (mode === 'block' && callerNum && callerNum !== ownerNum && !callerJid.endsWith('@g.us') && typeof Dinz.updateBlockStatus === 'function') {
                await new Promise((r) => setTimeout(r, 800));
                await Dinz.updateBlockStatus(callerJid, 'block').catch(() => {});
                blocked = true;
            }

            // 4. Kirim laporan ke Owner
            if (ownerJid) {
                const callerName = global.db?.users?.[callerJid]?.name || (Dinz.getName ? await Dinz.getName(callerJid).catch(() => '') : '') || 'Tanpa Nama';
                const report =
                    `\`📵 LAPORAN ANTI-CALL\`\n` +
                    `> ◦ *Nama :* ${callerName}\n` +
                    `> ◦ *Penelpon :* @${callerNum} (https://wa.me/${callerNum})\n` +
                    `> ◦ *Jenis Call :* *${callKind}*\n` +
                    `> ◦ *Tindakan :* ${blocked ? '🚫 Ditolak & Diblokir Otomatis' : '📵 Ditolak Otomatis'}\n` +
                    `> ◦ *Waktu :* ${moment().tz(tz).format('DD/MM/YYYY HH:mm:ss [WIB]')}`;
                await Dinz.sendMessage(ownerJid, {
                    text: report,
                    mentions: callerJid.endsWith('@s.whatsapp.net') ? [callerJid] : []
                }).catch(() => {});
            }
        } catch (_) {}
    }
}

function getCacheStats() {
    return { antideleteCached: msgCache.size };
}

function clearAntiDeleteCache() {
    msgCache.clear();
}

module.exports = {
    isAntiDeleteEnabled,
    getAntiCallMode,
    recordIncomingForAntiDelete,
    checkProtocolRevokeOnUpsert,
    handleMessagesUpdateForAntiDelete,
    handleIncomingCalls,
    getCacheStats,
    clearAntiDeleteCache
};
