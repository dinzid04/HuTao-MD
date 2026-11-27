const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const TMP_DIR = path.join(process.cwd(), 'tmp', 'kirimch');
const DRAFT_TTL_MS = 10 * 60 * 1000;
const drafts = (global._kirimChDrafts = global._kirimChDrafts || new Map());

function ensureTmpDir() {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function resolveFfmpegBin() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
    try {
        const ff = require('@ffmpeg-installer/ffmpeg');
        if (ff && ff.path && fs.existsSync(ff.path)) {
            try { fs.chmodSync(ff.path, 0o755); } catch (_) {}
            return ff.path;
        }
    } catch (_) {}
    return 'ffmpeg';
}

function makeDraftKey(Dinz, chatId, senderNum) {
    const botKey = Dinz?.isJadibot && Dinz?.jadibotNumber ? Dinz.jadibotNumber : 'main';
    return `${botKey}_${chatId}_${String(senderNum || '').replace(/[^0-9]/g, '')}`;
}

function pruneExpiredDrafts() {
    const now = Date.now();
    for (const [k, d] of drafts.entries()) {
        if (now > d.expiresAt) {
            if (d.mediaPath) { try { fs.unlinkSync(d.mediaPath); } catch (_) {} }
            drafts.delete(k);
        }
    }
}

function saveDraft(Dinz, chatId, senderNum, draftData) {
    pruneExpiredDrafts();
    const key = makeDraftKey(Dinz, chatId, senderNum);
    const prev = drafts.get(key);
    if (prev?.mediaPath && prev.mediaPath !== draftData.mediaPath) {
        try { fs.unlinkSync(prev.mediaPath); } catch (_) {}
    }
    const entry = {
        ...draftData,
        createdAt: Date.now(),
        expiresAt: Date.now() + DRAFT_TTL_MS
    };
    drafts.set(key, entry);
    return entry;
}

function getDraft(Dinz, chatId, senderNum) {
    pruneExpiredDrafts();
    return drafts.get(makeDraftKey(Dinz, chatId, senderNum)) || null;
}

function clearDraft(Dinz, chatId, senderNum) {
    const key = makeDraftKey(Dinz, chatId, senderNum);
    const prev = drafts.get(key);
    if (prev?.mediaPath) {
        try { fs.unlinkSync(prev.mediaPath); } catch (_) {}
    }
    drafts.delete(key);
}

function extractChannelTarget(text) {
    const raw = String(text || '');
    const urlMatch = raw.match(/https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    if (urlMatch) {
        return { raw: urlMatch[0], type: 'invite', value: urlMatch[1] };
    }
    const jidMatch = raw.match(/(\d{10,30}@newsletter)/i);
    if (jidMatch) {
        return { raw: jidMatch[1], type: 'jid', value: jidMatch[1] };
    }
    return null;
}

async function resolveChannelMetadata(Dinz, targetInput) {
    const parsed = typeof targetInput === 'string' ? extractChannelTarget(targetInput) : targetInput;
    if (!parsed) throw new Error('Link saluran WhatsApp tidak valid! Contoh: https://whatsapp.com/channel/0029Vb...');

    let meta = null;
    if (parsed.type === 'invite') {
        meta = await Dinz.newsletterMetadata('invite', parsed.value);
    } else {
        meta = await Dinz.newsletterMetadata('jid', parsed.value).catch(() => ({ id: parsed.value, name: 'Saluran WhatsApp' }));
    }
    if (!meta || !meta.id) {
        throw new Error('Gagal mengambil info Saluran WhatsApp. Pastikan link saluran benar & publik.');
    }

    const roleRaw = String(meta?.viewer_metadata?.role || meta?.role || '').toUpperCase();
    const isConfirmedNotAdmin = roleRaw === 'SUBSCRIBER' || roleRaw === 'GUEST';
    const isConfirmedAdmin = roleRaw === 'ADMIN' || roleRaw === 'OWNER';

    return {
        id: meta.id,
        name: meta.name || meta.thread_metadata?.name?.text || 'Saluran WhatsApp',
        subscribers: Number(meta.subscribers || meta.thread_metadata?.subscribers_count || 0),
        role: roleRaw || 'UNKNOWN',
        isConfirmedAdmin,
        isConfirmedNotAdmin
    };
}

async function convertToOpusVn(inputBuffer, extHint = 'mp3') {
    ensureTmpDir();
    const id = `chvn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const inPath = path.join(TMP_DIR, `${id}.${extHint}`);
    const outPath = path.join(TMP_DIR, `${id}.ogg`);
    fs.writeFileSync(inPath, inputBuffer);

    try {
        const ff = resolveFfmpegBin();
        await new Promise((resolve, reject) => {
            execFile(
                ff,
                ['-y', '-i', inPath, '-vn', '-c:a', 'libopus', '-ac', '1', '-ar', '48000', '-b:a', '48k', '-application', 'voip', '-map_metadata', '-1', outPath],
                { timeout: 60000 },
                (err) => (err ? reject(err) : resolve())
            );
        });
        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 200) {
            return { buffer: fs.readFileSync(outPath), mimetype: 'audio/ogg; codecs=opus', ptt: true };
        }
    } catch (_) {
    } finally {
        try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
        try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
    }
    return { buffer: inputBuffer, mimetype: 'audio/mpeg', ptt: false };
}

async function sendAudioToChannel(Dinz, chId, audioBuffer, {
    mode = 'biasa', // 'biasa' | 'forward'
    customChName = '',
    asFileMp3 = false,
    extHint = 'mp3'
} = {}) {
    let payloadBuf = audioBuffer;
    let mimetype = 'audio/mpeg';
    let ptt = false;

    if (!asFileMp3) {
        const conv = await convertToOpusVn(audioBuffer, extHint);
        payloadBuf = conv.buffer;
        mimetype = conv.mimetype;
        ptt = conv.ptt;
    }

    const msgPayload = {
        audio: payloadBuf,
        mimetype,
        ptt
    };

    if (mode === 'forward') {
        const displayChName = String(customChName || 'Saluran WhatsApp').trim().slice(0, 80);
        msgPayload.contextInfo = {
            isForwarded: true,
            forwardingScore: 9999,
            forwardedNewsletterMessageInfo: {
                newsletterJid: chId,
                newsletterName: displayChName,
                serverMessageId: 1
            }
        };
    }

    const sent = await Dinz.sendMessage(chId, msgPayload);
    if (!sent) {
        throw new Error('Gagal mengirim audio ke Saluran. Pastikan nomor bot sudah dijadikan Admin di saluran tersebut!');
    }
    return { sent, ptt, mimetype };
}

async function sendMediaOrTextToChannel(Dinz, chId, {
    kind, // 'image' | 'video' | 'ptv' | 'sticker' | 'document' | 'text'
    buffer = null,
    caption = '',
    mimetype = '',
    fileName = ''
} = {}) {
    let payload = null;
    if (kind === 'image') {
        payload = { image: buffer, ...(caption ? { caption } : {}) };
    } else if (kind === 'ptv') {
        payload = { video: buffer, ptv: true, mimetype: 'video/mp4' };
    } else if (kind === 'video') {
        payload = { video: buffer, mimetype: mimetype || 'video/mp4', ...(caption ? { caption } : {}) };
    } else if (kind === 'sticker') {
        payload = { sticker: buffer };
    } else if (kind === 'document') {
        payload = {
            document: buffer,
            mimetype: mimetype || 'application/octet-stream',
            fileName: fileName || 'file',
            ...(caption ? { caption } : {})
        };
    } else if (kind === 'text') {
        payload = { text: caption };
    } else {
        throw new Error('Tipe media tidak didukung untuk dikirim ke saluran.');
    }

    const sent = await Dinz.sendMessage(chId, payload);
    if (!sent) {
        throw new Error('Gagal mengirim pesan ke Saluran. Pastikan nomor bot sudah dijadikan Admin di saluran tersebut!');
    }
    return sent;
}

module.exports = {
    TMP_DIR,
    ensureTmpDir,
    saveDraft,
    getDraft,
    clearDraft,
    extractChannelTarget,
    resolveChannelMetadata,
    convertToOpusVn,
    sendAudioToChannel,
    sendMediaOrTextToChannel
};
