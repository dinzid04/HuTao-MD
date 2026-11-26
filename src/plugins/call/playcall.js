const { callEngine, youtubeService, formatCard, toMono, toSmallCaps, normalizeDigits, getSavedDefaultQuality, getSavedDefaultAudioQuality, parsePlayCallFlags, extractGroupTargets, buildNotReadyGuide } = require('./_helper');

module.exports = {
    name: 'playcall',
    category: 'call',
    commands: [
        'playcall', 'callmusic', 'vcplay', 'playvc', 'callgrup', 'callgroup', 'vcgrup', 'groupcall'
    ],

    async execute(ctx) {
        const {
            Dinz, m, command, args, text, body, mime, qmsg, isCreator, Reply, getSenderNumber,
            resolveTargetNumber, prefixMgr, usedPrefix, checkLimit, addLimit
        } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');
        const requesterName = m.pushName || `+${normalizeDigits(getSenderNumber(m)) || 'User'}`;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isGroupAlias = ['callgrup', 'callgroup', 'vcgrup', 'groupcall'].includes(command);
        const defaultMode = (command === 'vcplay' || command === 'playvc' || command === 'vcgrup') ? 'video' : 'audio';
        const defaultCallType = isGroupAlias ? 'group' : 'link';

        const parsed = parsePlayCallFlags(args, { defaultMode, defaultCallType });
        let { mode, modeExplicit, callType, quality, audioQuality, preset, audioPreset, queryText } = parsed;

        const hasQuotedVideo = /video/.test(mime);
        const hasQuotedAudio = /audio/.test(mime);

        if (!queryText && !hasQuotedVideo && !hasQuotedAudio) {
            const savedQ = getSavedDefaultQuality();
            const savedAudioQ = getSavedDefaultAudioQuality();
            return Reply(formatCard({
                icon: '📹',
                title: 'PLAYCALL VIDEO & MUSIK',
                rows: [
                    { label: 'Video Default', value: toMono(savedQ) },
                    { label: 'Audio MLow', value: `${toMono(savedAudioQ)} (${callEngine.resolveAudioQualityPreset(savedAudioQ).label})` },
                    { label: 'Preset Video', value: `${toMono('360p')} • ${toMono('480p')} • ${toMono('720p')}` },
                    { label: 'Preset Audio', value: `${toMono('low')} • ${toMono('normal')} • ${toMono('clear')} • ${toMono('bass')} • ${toMono('studio')}` }
                ],
                body: [
                    `*${toSmallCaps('mode call link (private / room)')}:*`,
                    `◦ ${toMono(`${pfx}playcall video 720p clear car outside`)}`,
                    `◦ ${toMono(`${pfx}playcall audio studio alan walker`)}`,
                    ``,
                    `*${toSmallCaps('mode call grup (langsung di grup + auto antrean)')}:*`,
                    `◦ ${toMono(`${pfx}callgrup video 480p car outside`)}`,
                    `◦ ${toMono(`${pfx}callgrup audio studio alan walker`)}`,
                    ``,
                    `*${toSmallCaps('antrean & kontrol')}:*`,
                    `◦ ${toMono(`${pfx}callqueue`)} (lihat daftar antrean)`,
                    `◦ ${toMono(`${pfx}skipcall`)} (lewati ke lagu berikutnya)`,
                    `◦ ${toMono(`${pfx}clearqueue`)} (hapus antrean)`,
                    `◦ ${toMono(`${pfx}callquality 720p studio`)} • ${toMono(`${pfx}stopcall`)}`
                ].join('\n'),
                footer: 'streaming langsung ke video/voice call whatsapp via meowcaller bridge'
            }));
        }

        if (!modeExplicit && !queryText) {
            if (hasQuotedVideo) mode = 'video';
            else if (hasQuotedAudio) mode = 'audio';
        }

        if (callType === 'group' && !m.isGroup && (!m.mentionedJid || m.mentionedJid.length < 2)) {
            return Reply(`❌ Mode *Group Call* hanya bisa dipakai di dalam *grup WhatsApp* (atau tag minimal 2 orang).\nContoh di grup: ${toMono(`${pfx}callgrup audio clear alan walker`)}`);
        }

        let health = null;
        try {
            health = await callEngine.ensureRunning();
            if (!health.loggedIn) {
                return Reply(buildNotReadyGuide(pfx, 'Bridge aktif, tapi belum login WA caller. Ketik .callpair <nomor>'));
            }
        } catch (err) {
            return Reply(buildNotReadyGuide(pfx, err.message));
        }

        if (!callEngine.supportsGroupCall(health)) {
            await Reply(
                `⚙️ Memperbarui engine MeowCaller ke *v2.3* (YouTube Screen Share + Prioritas Pengirim Group Call + Auto-Antrean)...\n` +
                `_${toSmallCaps('mohon tunggu 1-2 menit, cukup sekali saja tanpa pairing ulang')}_`
            );
            try {
                const rebuilt = await callEngine.buildBridge();
                health = rebuilt.health || await callEngine.ensureRunning();
            } catch (buildErr) {
                return Reply(`❌ Gagal update otomatis engine MeowCaller: ${buildErr.message}\nOwner silakan ketik ${toMono(`${pfx}callsetup`)}.`);
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const existingActive = Array.isArray(health?.activeCalls) && health.activeCalls.length > 0 ? health.activeCalls[0] : null;
        const isPrimaryStarter = !existingActive && callEngine.claimPrimarySlot();

        let mediaAsset = null;
        try {
            let inputBuffer = null;
            let inputExt = mode === 'video' ? 'mp4' : 'mp3';
            let previewTitle = queryText;
            const qualLabel = mode === 'video' ? `${preset.videoLabel} • ${audioPreset.label}` : audioPreset.label;
            const scopeLabel = callType === 'group' ? 'Group Call' : 'Call Link';

            if (!queryText && (hasQuotedVideo || hasQuotedAudio) && typeof qmsg?.download === 'function') {
                previewTitle = mode === 'video' ? 'Video Reply' : 'Audio Reply';
                await Reply(
                    isPrimaryStarter
                        ? `🎬 Menyiapkan ${mode === 'video' ? 'video' : 'audio'} *${previewTitle}* (${qualLabel}) untuk *${scopeLabel}*...\n_${toSmallCaps('mohon tunggu sebentar proses mastering & encode...')}_`
                        : `📥 Panggilan sedang berjalan/disiapkan — menyiapkan *${previewTitle}* untuk masuk *Daftar Antrean*...`
                );
                inputBuffer = await qmsg.download();
                inputExt = hasQuotedVideo ? 'mp4' : 'mp3';
            } else {
                const targetInfo = await youtubeService.resolveYoutubeTarget(queryText, mode === 'audio').catch(() => null);
                previewTitle = targetInfo?.title || queryText;
                await Reply(
                    isPrimaryStarter
                        ? `🎬 Menyiapkan ${mode === 'video' ? 'video' : 'audio'} *${previewTitle}* (${qualLabel}) untuk *${scopeLabel}*...\n_${toSmallCaps('lamanya kira-kira beberapa detik tergantung durasi & kualitas')}_`
                        : `📥 Panggilan sedang berjalan/disiapkan — *${previewTitle}* sedang diproses untuk masuk *Daftar Antrean*!\n_${toSmallCaps('otomatis berputar setelah lagu sebelumnya selesai')}_`
                );
            }

            const effectiveMode = (!isPrimaryStarter && existingActive && existingActive.mode === 'audio')
                ? 'audio'
                : mode;

            mediaAsset = await callEngine.prepareCallMedia({
                mode: effectiveMode,
                query: queryText,
                inputBuffer,
                inputExt,
                quality,
                audioQuality
            });

            const dispatchResult = await callEngine.runSerializedCallOp(async () => {
                const liveActive = await callEngine.getActiveCall();
                if (liveActive) {
                    const enq = await callEngine.enqueueCallTrack({
                        callId: liveActive.callId,
                        mode: effectiveMode,
                        quality: mediaAsset.meta.resolution,
                        requestedBy: requesterName,
                        chatJid: m.chat,
                        h264Path: mediaAsset.h264Path,
                        audioPath: mediaAsset.audioPath,
                        title: mediaAsset.meta.title || previewTitle,
                        fps: mediaAsset.fps
                    });
                    return { queued: true, enq, liveActive };
                }

                const senderNum = normalizeDigits(getSenderNumber(m));
                const senderLid = m.sender && String(m.sender).endsWith('@lid')
                    ? m.sender
                    : (senderNum && global.phoneToLidMap?.[senderNum] ? `${global.phoneToLidMap[senderNum]}@lid` : '');
                const groupTargets = callType === 'group'
                    ? await extractGroupTargets(Dinz, m, senderNum, health?.jid || '', resolveTargetNumber)
                    : [];

                const started = await callEngine.startPlayCall({
                    mode: effectiveMode,
                    callType,
                    screenShare: effectiveMode === 'video',
                    target: senderNum,
                    targetLid: senderLid,
                    groupJid: callType === 'group' && m.isGroup ? m.chat : '',
                    targets: groupTargets,
                    quality: mediaAsset.meta.resolution,
                    requestedBy: requesterName,
                    chatJid: m.chat,
                    h264Path: mediaAsset.h264Path,
                    audioPath: mediaAsset.audioPath,
                    title: mediaAsset.meta.title || previewTitle,
                    fps: mediaAsset.fps,
                    loop: true
                });
                return { queued: false, started };
            });

            callEngine.startQueueWatcher(Dinz);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

            if (dispatchResult.queued) {
                const enq = dispatchResult.enq;
                const linkInfo = enq.linkUrl ? `\n> ʟɪɴᴋ : ${String(enq.linkUrl).replace(/call\.whatsapp\.com\/audio\//i, 'call.whatsapp.com/voice/')}` : '';
                return Reply(
                    `📥 *Ditambahkan ke Daftar Antrean (#${enq.position})!*\n` +
                    `Lagu akan otomatis diputar tepat setelah lagu saat ini habis.\n\n` +
                    `> ᴊᴜᴅᴜʟ : *${mediaAsset.meta.title || previewTitle}*\n` +
                    `> ʀᴇǫᴜᴇsᴛ : ${requesterName}\n` +
                    `> ᴋᴜᴀʟɪᴛᴀs : ${toMono(mediaAsset.meta.resolution)}\n` +
                    `> sᴇᴅᴀɴɢ ᴘᴜᴛᴀʀ : ${enq.nowPlaying || '-'}${linkInfo}\n` +
                    `> ᴋᴏɴᴛʀᴏʟ : ${toMono(`${pfx}callqueue`)} • ${toMono(`${pfx}skipcall`)}`
                );
            }

            const started = dispatchResult.started;
            if (callType === 'group' && !started.fallbackLink) {
                const grpTitle = effectiveMode === 'video' ? '📹 Group Video Call (Screen Share) dimulai!' : '📞 Group Voice Call dimulai!';
                const targetInfoStr = started.targetCount
                    ? `${started.targetCount} peserta (${started.senderIncluded ? 'kamu termasuk' : 'grup'})`
                    : 'Anggota grup dipanggil';
                return Reply(
                    `${grpTitle}\n` +
                    `Angkat panggilan masuk atau klik *Gabung* di banner grup!\n\n` +
                    `> ᴊᴜᴅᴜʟ : *${mediaAsset.meta.title || previewTitle}*\n` +
                    `> ʀᴇǫᴜᴇsᴛ : ${requesterName}\n` +
                    `> ᴍᴏᴅᴇ : ${toMono(effectiveMode === 'video' ? 'Group Video + Screen Share' : 'Group Voice Call')}\n` +
                    `> ᴋᴜᴀʟɪᴛᴀs : ${toMono(mediaAsset.meta.resolution)}\n` +
                    `> ᴘᴇsᴇʀᴛᴀ : ${toMono(targetInfoStr)}\n` +
                    `> ᴋᴏɴᴛʀᴏʟ : ${toMono(`${pfx}callinvite @user`)} • ${toMono(`${pfx}callqueue`)} • ${toMono(`${pfx}skipcall`)} • ${toMono(`${pfx}stopcall`)}\n\n` +
                    `_${toSmallCaps('tips: pakai')} ${toMono(`${pfx}playcall ${effectiveMode} <judul>`)} ${toSmallCaps('untuk room link opsional tanpa membunyikan hp member lain')}_`
                );
            }

            const modeLabel = effectiveMode === 'video' ? '📹 Video Call (Screen Share) dimulai!' : '📞 Voice Call dimulai!';
            const finalLink = String(started.linkUrl || '').replace(/call\.whatsapp\.com\/audio\//i, 'call.whatsapp.com/voice/');
            const fallbackNote = started.fallbackLink && started.fallbackReason
                ? `\n\n_ℹ️ ${started.fallbackReason}_`
                : '';
            return Reply(
                `${modeLabel}\n` +
                `Gabung opsional lewat link ini:\n${finalLink}\n\n` +
                `> ᴊᴜᴅᴜʟ : *${mediaAsset.meta.title || previewTitle}*\n` +
                `> ʀᴇǫᴜᴇsᴛ : ${requesterName}\n` +
                `> ᴛᴀᴍᴘɪʟᴀɴ : ${toMono(effectiveMode === 'video' ? 'YouTube Screen Share (Auto-Start saat gabung)' : 'MLow Audio Stream')}\n` +
                `> ᴋᴜᴀʟɪᴛᴀs : ${toMono(mediaAsset.meta.resolution)}\n` +
                `> ᴋᴏɴᴛʀᴏʟ : ${toMono(`${pfx}callqueue`)} • ${toMono(`${pfx}skipcall`)} • ${toMono(`${pfx}stopcall`)}${fallbackNote}`
            );
        } catch (err) {
            if (mediaAsset) {
                callEngine.cleanupPaths([mediaAsset.h264Path, mediaAsset.audioPath]);
            }
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memulai ${mode} call: ${err.message}`);
        } finally {
            if (isPrimaryStarter) {
                callEngine.releasePrimarySlot();
            }
        }
        return true;
    }
};
