const { callEngine, formatCard, toMono, toBoldSans, toSmallCaps, getSavedDefaultQuality, getSavedDefaultAudioQuality } = require('./_helper');

module.exports = {
    name: 'callquality',
    category: 'call',
    commands: [
        'callquality', 'setcallquality', 'kualitascall', 'callaudioquality', 'audiocallquality', 'setcallaudio', 'mlowquality'
    ],

    async execute(ctx) {
        const { Dinz, command, args, text, body, Reply, botCtx, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        const isAudioOnlyCmd = ['callaudioquality', 'audiocallquality', 'setcallaudio', 'mlowquality'].includes(command);
        const curVidKey = getSavedDefaultQuality();
        const curAudKey = getSavedDefaultAudioQuality();
        const curVid = callEngine.resolveQualityPreset(curVidKey);
        const curAud = callEngine.resolveAudioQualityPreset(curAudKey);

        const tokens = (args || []).map((a) => String(a || '').trim().toLowerCase()).filter(Boolean);
        if (tokens.length === 0) {
            const vidList = Object.values(callEngine.CALL_QUALITY_PRESETS).map((p) =>
                `${p.key === curVidKey ? '✅' : '◦'} ${toBoldSans(p.key.toUpperCase())} — ${toMono(p.videoLabel)}`
            ).join('\n');
            const audList = Object.values(callEngine.CALL_AUDIO_PRESETS).map((p) =>
                `${p.key === curAudKey ? '✅' : '◦'} ${toBoldSans(p.key.toUpperCase())} — ${toMono(p.label)}`
            ).join('\n');

            return Reply(formatCard({
                icon: '🎚️',
                title: 'KUALITAS VIDEO & AUDIO MLOW CALL',
                rows: [
                    { label: 'Video Default', value: `${toBoldSans(curVid.key.toUpperCase())} (${toMono(curVid.videoLabel)})` },
                    { label: 'Audio MLow', value: `${toBoldSans(curAud.key.toUpperCase())} (${toMono(curAud.label)})` }
                ],
                body: [
                    `*${toSmallCaps('preset video')}:*`,
                    vidList,
                    ``,
                    `*${toSmallCaps('preset audio lossless pcm -> mlow')}:*`,
                    audList,
                    ``,
                    `_${toSmallCaps('tips: pakai')} ${toMono('clear')} ${toSmallCaps('atau')} ${toMono('studio')} ${toSmallCaps('agar suara jernih & tidak mendem')}_`
                ].join('\n'),
                footer: `contoh: ${pfx}callquality 720p studio  |  ${pfx}callaudioquality clear`
            }));
        }

        if (!global.db.settings) global.db.settings = {};
        let changedVid = null;
        let changedAud = null;

        for (const tok of tokens) {
            if (tok === 'video' || tok === 'audio' || tok === 'mlow') continue;
            if (!isAudioOnlyCmd && callEngine.isVideoQualityToken(tok)) {
                changedVid = callEngine.resolveQualityPreset(tok);
                global.db.settings.callQuality = changedVid.key;
            } else if (callEngine.isAudioQualityToken(tok)) {
                changedAud = callEngine.resolveAudioQualityPreset(tok);
                global.db.settings.callAudioQuality = changedAud.key;
            }
        }

        if (!changedVid && !changedAud) {
            return Reply(
                `❌ Preset tidak dikenal.\n` +
                `> ᴠɪᴅᴇᴏ : ${toMono('360p')} • ${toMono('480p')} • ${toMono('720p')}\n` +
                `> ᴀᴜᴅɪᴏ ᴍʟᴏᴡ : ${toMono('low')} • ${toMono('normal')} • ${toMono('clear')} • ${toMono('bass')} • ${toMono('studio')}`
            );
        }

        if (botCtx?.saveRootDb) botCtx.saveRootDb();
        const finalVid = changedVid || curVid;
        const finalAud = changedAud || curAud;

        await Dinz.sendMessage(m.chat, { react: { text: '🎚️', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🎚️',
            title: 'KUALITAS CALL DIPERBARUI',
            rows: [
                { label: 'Video', value: `${toBoldSans(finalVid.key.toUpperCase())} • ${toMono(finalVid.videoLabel)}` },
                { label: 'Audio MLow', value: `${toBoldSans(finalAud.key.toUpperCase())} • ${toMono(finalAud.label)}` }
            ],
            footer: `berlaku otomatis untuk ${pfx}playcall, ${pfx}callgrup, ${pfx}callvideo & ${pfx}callaudio`
        }));
    }
};
