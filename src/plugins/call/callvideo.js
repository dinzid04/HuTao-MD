const { callEngine, youtubeService, formatCard, toMono, normalizeDigits, isLikelyPhoneArg, getSavedDefaultQuality, getSavedDefaultAudioQuality, buildNotReadyGuide } = require('./_helper');

module.exports = {
    name: 'callvideo',
    category: 'call',
    commands: ['callvideo', 'callaudio', 'playvideo'],

    async execute(ctx) {
        const {
            Dinz, m, command, args, text, mime, qmsg, isCreator, Reply, example,
            getTargetNumber, getSenderNumber, prefixMgr, usedPrefix, checkLimit, addLimit
        } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');
        const requesterName = m.pushName || `+${normalizeDigits(getSenderNumber(m)) || 'User'}`;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const mode = (command === 'callaudio') ? 'audio' : 'video';

        let targetNum = '';
        let remainingArgs = [...(args || [])];
        const firstToken = remainingArgs[0] || '';

        if (m.mentionedJid && m.mentionedJid.length > 0 && firstToken.startsWith('@')) {
            targetNum = normalizeDigits(getTargetNumber(m, firstToken));
            remainingArgs = remainingArgs.slice(1);
        } else if (isLikelyPhoneArg(firstToken)) {
            targetNum = normalizeDigits(firstToken);
            remainingArgs = remainingArgs.slice(1);
        } else {
            targetNum = normalizeDigits(getSenderNumber(m));
        }

        let quality = getSavedDefaultQuality();
        let audioQuality = getSavedDefaultAudioQuality();
        while (remainingArgs.length > 0) {
            const tok = String(remainingArgs[0] || '').toLowerCase();
            if (callEngine.isVideoQualityToken(tok)) {
                quality = callEngine.resolveQualityPreset(tok, quality).key;
                remainingArgs.shift();
            } else if (callEngine.isAudioQualityToken(tok)) {
                audioQuality = callEngine.resolveAudioQualityPreset(tok, audioQuality).key;
                remainingArgs.shift();
            } else {
                break;
            }
        }
        const preset = callEngine.resolveQualityPreset(quality, callEngine.DEFAULT_CALL_QUALITY);
        const audioPreset = callEngine.resolveAudioQualityPreset(audioQuality, callEngine.DEFAULT_AUDIO_QUALITY);
        const queryText = remainingArgs.join(' ').trim();

        const hasQuotedMedia = /video|audio/.test(mime);
        if (!queryText && !hasQuotedMedia) {
            return Reply(example(`${targetNum || '62812xxx'} ${mode === 'video' ? '720p clear' : 'studio'} car outside`));
        }

        try {
            const health = await callEngine.ensureRunning();
            if (!health.loggedIn) {
                return Reply(buildNotReadyGuide(pfx, 'Bridge aktif, tapi belum login WA caller. Ketik .callpair <nomor>'));
            }
        } catch (err) {
            return Reply(buildNotReadyGuide(pfx, err.message));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        let mediaAsset = null;
        try {
            let inputBuffer = null;
            let inputExt = mode === 'video' ? 'mp4' : 'mp3';
            let previewTitle = queryText || 'Media Reply';
            const qualLabel = mode === 'video' ? `${preset.videoLabel} • ${audioPreset.label}` : audioPreset.label;

            if (!queryText && hasQuotedMedia && typeof qmsg?.download === 'function') {
                await Reply(`🎬 Menyiapkan ${mode} (${qualLabel}) untuk panggilan ke *+${targetNum}*...`);
                inputBuffer = await qmsg.download();
                inputExt = /video/.test(mime) ? 'mp4' : 'mp3';
            } else {
                const targetInfo = await youtubeService.resolveYoutubeTarget(queryText, mode === 'audio').catch(() => null);
                previewTitle = targetInfo?.title || queryText;
                await Reply(`🎬 Menyiapkan ${mode} *${previewTitle}* (${qualLabel}) untuk panggilan langsung ke *+${targetNum}*...`);
            }

            mediaAsset = await callEngine.prepareCallMedia({
                mode,
                query: queryText,
                inputBuffer,
                inputExt,
                quality,
                audioQuality
            });

            const directResult = await callEngine.runSerializedCallOp(async () => {
                const liveActive = await callEngine.getActiveCall();
                if (liveActive && liveActive.callType === 'direct' && liveActive.target === targetNum) {
                    const enq = await callEngine.enqueueCallTrack({
                        callId: liveActive.callId,
                        mode,
                        quality: mediaAsset.meta.resolution,
                        requestedBy: requesterName,
                        chatJid: m.chat,
                        h264Path: mediaAsset.h264Path,
                        audioPath: mediaAsset.audioPath,
                        title: mediaAsset.meta.title || previewTitle,
                        fps: mediaAsset.fps
                    });
                    return { queued: true, enq };
                }

                await callEngine.startPlayCall({
                    mode,
                    callType: 'direct',
                    screenShare: mode === 'video',
                    target: targetNum,
                    quality: mediaAsset.meta.resolution,
                    requestedBy: requesterName,
                    chatJid: m.chat,
                    h264Path: mediaAsset.h264Path,
                    audioPath: mediaAsset.audioPath,
                    title: mediaAsset.meta.title || previewTitle,
                    fps: mediaAsset.fps,
                    loop: false
                });
                return { queued: false };
            });

            callEngine.startQueueWatcher(Dinz);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

            if (directResult.queued) {
                return Reply(
                    `📥 *Ditambahkan ke Antrean Direct Call (#${directResult.enq.position})!*\n` +
                    `> ᴊᴜᴅᴜʟ : *${mediaAsset.meta.title || previewTitle}*\n` +
                    `> ᴋᴜᴀʟɪᴛᴀs : ${toMono(mediaAsset.meta.resolution)}\n` +
                    `> ᴋᴏɴᴛʀᴏʟ : ${toMono(`${pfx}callqueue`)} • ${toMono(`${pfx}skipcall`)}`
                );
            }

            return Reply(formatCard({
                icon: mode === 'video' ? '📹' : '📞',
                title: mode === 'video' ? 'MEMANGGIL VIDEO CALL' : 'MEMANGGIL VOICE CALL',
                rows: [
                    { label: 'Target', value: toMono(`+${targetNum}`) },
                    { label: 'Media', value: mediaAsset.meta.title || previewTitle },
                    { label: 'Kualitas', value: toMono(mediaAsset.meta.resolution) }
                ],
                footer: `angkat panggilan masuk! ketik ${pfx}stopcall untuk menghentikan`
            }));
        } catch (err) {
            if (mediaAsset) {
                callEngine.cleanupPaths([mediaAsset.h264Path, mediaAsset.audioPath]);
            }
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal melakukan direct ${mode} call: ${err.message}`);
        }
        return true;
    }
};
