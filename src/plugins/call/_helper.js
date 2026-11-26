const callEngine = require('../../services/call-engine');
const youtubeService = require('../../services/youtube');
const { formatCard, toMono, toBoldSans, toSmallCaps } = require('../../utils/formatter');

function normalizeDigits(raw) {
    let digits = String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (digits.startsWith('08')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) digits = '62' + digits;
    return digits;
}

function isLikelyPhoneArg(token) {
    const clean = String(token || '').replace(/[^0-9+]/g, '');
    if (!clean) return false;
    const digits = clean.replace(/[^0-9]/g, '');
    return digits.length >= 9 && digits.length <= 15 && /^(?:08|62|8|\+?\d{10,15})/.test(clean);
}

function getSavedDefaultQuality() {
    const saved = global.db?.settings?.callQuality || callEngine.DEFAULT_CALL_QUALITY;
    return callEngine.resolveQualityPreset(saved, callEngine.DEFAULT_CALL_QUALITY).key;
}

function getSavedDefaultAudioQuality() {
    const saved = global.db?.settings?.callAudioQuality || callEngine.DEFAULT_AUDIO_QUALITY;
    return callEngine.resolveAudioQualityPreset(saved, callEngine.DEFAULT_AUDIO_QUALITY).key;
}

function parsePlayCallFlags(rawArgs, { defaultMode = 'audio', defaultCallType = 'link' } = {}) {
    let mode = defaultMode;
    let callType = defaultCallType;
    let quality = getSavedDefaultQuality();
    let audioQuality = getSavedDefaultAudioQuality();
    let modeExplicit = false;

    const rest = [];
    let scanningFlags = true;

    for (const token of rawArgs || []) {
        const low = String(token || '').trim().toLowerCase();
        if (!low) continue;

        if (scanningFlags) {
            if (['video', 'vid', 'vc', 'mp4'].includes(low)) {
                mode = 'video';
                modeExplicit = true;
                continue;
            }
            if (['audio', 'music', 'musik', 'mp3', 'voice', 'vn'].includes(low)) {
                mode = 'audio';
                modeExplicit = true;
                continue;
            }
            if (['grup', 'group', 'gc', 'gcall'].includes(low)) {
                callType = 'group';
                continue;
            }
            if (['link', 'private', 'pv', 'room'].includes(low)) {
                callType = 'link';
                continue;
            }
            if (callEngine.isVideoQualityToken(low)) {
                quality = callEngine.resolveQualityPreset(low, quality).key;
                continue;
            }
            if (callEngine.isAudioQualityToken(low)) {
                audioQuality = callEngine.resolveAudioQualityPreset(low, audioQuality).key;
                if (low === 'hd' || low === 'ultra' || low === 'max') {
                    quality = '720p';
                } else if (low === 'low' || low === 'hemat') {
                    quality = '360p';
                }
                continue;
            }
            scanningFlags = false;
        }
        rest.push(token);
    }

    return {
        mode,
        modeExplicit,
        callType,
        quality,
        audioQuality,
        preset: callEngine.resolveQualityPreset(quality, callEngine.DEFAULT_CALL_QUALITY),
        audioPreset: callEngine.resolveAudioQualityPreset(audioQuality, callEngine.DEFAULT_AUDIO_QUALITY),
        queryText: rest.join(' ').trim()
    };
}

async function extractGroupTargets(Dinz, m, senderNum, callerJid, resolveTargetNumber) {
    const MAX_TARGETS = 12;
    const out = [];
    const seen = new Set();
    const callerDigits = normalizeDigits(callerJid || '');
    const callerLid = callerDigits && global.phoneToLidMap ? global.phoneToLidMap[callerDigits] : '';

    let participants = Array.isArray(m.metadata?.participants) ? m.metadata.participants : [];
    if (m.isGroup && participants.length < 3) {
        try {
            const freshMeta = await Dinz.groupMetadata(m.chat);
            if (Array.isArray(freshMeta?.participants) && freshMeta.participants.length > 0) {
                participants = freshMeta.participants;
            }
        } catch (_) {}
    }

    const addLid = (rawLid) => {
        if (out.length >= MAX_TARGETS || !rawLid) return false;
        const lidDigits = String(rawLid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (!lidDigits) return false;
        if (callerLid && lidDigits === callerLid) return false;
        const mappedPn = global.lidMap ? global.lidMap[lidDigits] : '';
        if (callerDigits && mappedPn && mappedPn === callerDigits) return false;
        if (seen.has(`lid:${lidDigits}`) || (mappedPn && seen.has(`pn:${mappedPn}`))) return true;
        seen.add(`lid:${lidDigits}`);
        if (mappedPn) seen.add(`pn:${mappedPn}`);
        out.push(`${lidDigits}@lid`);
        return true;
    };

    const addCandidate = (raw) => {
        if (out.length >= MAX_TARGETS || !raw) return;
        const str = String(raw).trim();
        if (!str) return;
        if (str.endsWith('@lid')) {
            addLid(str);
            return;
        }
        const resolved = typeof resolveTargetNumber === 'function' ? resolveTargetNumber(str, m) : str;
        const d = normalizeDigits(resolved || str);
        if (!d || d.length < 8) return;
        if (callerDigits && d === callerDigits) return;
        const knownLid = global.phoneToLidMap ? global.phoneToLidMap[d] : '';
        if (knownLid) {
            addLid(knownLid);
            return;
        }
        if (seen.has(`pn:${d}`)) return;
        seen.add(`pn:${d}`);
        out.push(d);
    };

    if (m.sender && String(m.sender).endsWith('@lid')) addLid(m.sender);
    else if (senderNum) addCandidate(senderNum);

    if (Array.isArray(m.mentionedJid)) {
        for (const jid of m.mentionedJid) addCandidate(jid);
    }

    for (const p of participants) {
        if (out.length >= MAX_TARGETS) break;
        const lidCand = (p.lid && String(p.lid).includes('@lid'))
            ? p.lid
            : (p.id && String(p.id).endsWith('@lid') ? p.id : '');
        if (lidCand) {
            addLid(lidCand);
            continue;
        }
        const pnCand = p.jid || p.phoneNumber || p.id;
        if (pnCand) addCandidate(pnCand);
    }

    return out;
}

function buildNotReadyGuide(pfx, reasonMsg) {
    return formatCard({
        icon: '📡',
        title: 'MEOWCALLER BRIDGE BELUM SIAP',
        rows: [
            { label: 'Status', value: reasonMsg || 'Engine belum terpasang / belum dipairing' }
        ],
        body: [
            `*${toSmallCaps('cara aktifkan fitur playcall di baileys')}:*`,
            `1. Ketik ${toMono(`${pfx}callsetup`)} (Owner) untuk build otomatis engine MeowCaller (pure Go, tanpa root).`,
            `2. Ketik ${toMono(`${pfx}callpair 628xxx`)} (Owner) untuk pairing akun caller lewat kode 8 digit (boleh nomor bot yang sama sbg perangkat tertaut ke-2, atau nomor khusus caller).`,
            `3. Setelah terhubung, langsung pakai ${toMono(`${pfx}playcall video <judul yt>`)} atau ${toMono(`${pfx}callgrup audio studio <judul yt>`)}!`,
            ``,
            `_${toSmallCaps('tips: pakai')} ${toMono(`${pfx}calllink video`)} ${toSmallCaps('jika hanya ingin buat tautan vc langsung dari baileys')}_`
        ].join('\n')
    });
}

module.exports = {
    callEngine,
    youtubeService,
    formatCard,
    toMono,
    toBoldSans,
    toSmallCaps,
    normalizeDigits,
    isLikelyPhoneArg,
    getSavedDefaultQuality,
    getSavedDefaultAudioQuality,
    parsePlayCallFlags,
    extractGroupTargets,
    buildNotReadyGuide
};
