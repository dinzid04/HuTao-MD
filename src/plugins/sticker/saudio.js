const stickerAudio = require('../../services/sticker-audio');
const { formatCard, toMono, toBoldSans, toSmallCaps } = require('../../utils/formatter');

module.exports = {
    name: 'saudio',
    category: 'sticker',
    commands: ['saudio', 'stickeraudio', 'stikeraudio', 'sa'],

    async execute(ctx) {
        const { Dinz, m, text, body, isCreator, Reply, prefixMgr, usedPrefix, checkLimit, addLimit } = ctx;

        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;
        const rawArg = (text || '').trim().toLowerCase();

        if (/^(reset|del|hapus|cancel|batal)$/.test(rawArg)) {
            stickerAudio.clearSession(m.sender);
            return Reply('🗑️ Sesi Sticker Audio dibatalkan.');
        }

        const staticOnly = /\b(static|statis|foto|img|diam|frame)\b/.test(rawArg);

        const helpText = formatCard({
            icon: '🎵',
            title: 'STICKER AUDIO',
            body:
                `${toSmallCaps('gabungkan video ber-audio atau gambar/stiker + audio menjadi sticker audio')}\n\n` +
                `*${toBoldSans('Mode Video Langsung (1 Langkah)')}*\n` +
                `◦ Kirim / reply *video yang ada audionya* dengan ${toMono(`${pfx}saudio`)}\n` +
                `◦ Tambah ${toMono('foto')} (${toMono(`${pfx}saudio foto`)}) jika ingin stiker diam\n\n` +
                `*${toBoldSans('Mode Sekali Tembak (2 Media)')}*\n` +
                `◦ Reply audio/VN + kirim gambar/stiker/video dengan ${toMono(`${pfx}saudio`)}\n` +
                `◦ Reply gambar/stiker + kirim audio/video dengan ${toMono(`${pfx}saudio`)}\n\n` +
                `*${toBoldSans('Mode 2 Langkah')}*\n` +
                `◦ 1. Kirim / reply gambar/stiker dengan ${toMono(`${pfx}saudio`)}\n` +
                `◦ 2. Kirim / reply audio/VN dengan ${toMono(`${pfx}saudio`)}`,
            footer: `Ketik ${pfx}saudio reset untuk membatalkan sesi tersimpan`
        });

        const quotedRaw = stickerAudio.getQuotedRawMessage(m);
        const [qMedia, curMedia] = await Promise.all([
            stickerAudio.extractMediaFromRawMessage(quotedRaw).catch(() => null),
            stickerAudio.extractMediaFromRawMessage(m.message).catch(() => null)
        ]);

        let audioBuf = null;
        let visualBuf = null;
        let videoMedia = null;
        for (const item of [qMedia, curMedia]) {
            if (!item) continue;
            if (item.kind === 'audio' && !audioBuf) audioBuf = item.buf;
            else if (item.kind === 'visual' && !visualBuf) visualBuf = item.buf;
            else if (item.kind === 'video' && !videoMedia) videoMedia = item;
        }

        let videoNoAudioNotice = false;
        if (videoMedia) {
            if (videoMedia.seconds > 60) {
                return Reply('❌ Durasi video terlalu panjang! Maksimal *60 detik* untuk Sticker Audio.');
            }
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const extracted = await stickerAudio.extractFromVideo(videoMedia.buf, {
                    staticOnly,
                    maxDuration: 8,
                    maxAudioDuration: 60
                });
                if (!visualBuf && extracted.visualBuf) {
                    visualBuf = extracted.visualBuf;
                }
                if (!audioBuf && extracted.hasAudio) {
                    audioBuf = extracted.audioBuf;
                } else if (!audioBuf && !extracted.hasAudio) {
                    videoNoAudioNotice = true;
                }
            } catch (vErr) {
                console.error('saudio video extract error:', vErr?.message || vErr);
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal memproses video untuk Sticker Audio:\n${String(vErr?.message || vErr).slice(0, 260)}`);
            }
        }

        const saved = stickerAudio.getSession(m.sender) || { audioBuf: null, visualBuf: null };
        if (audioBuf) saved.audioBuf = audioBuf;
        if (visualBuf) saved.visualBuf = visualBuf;

        if (saved.audioBuf && saved.visualBuf) {
            if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
            stickerAudio.clearSession(m.sender);
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                await stickerAudio.sendStickerAudio(Dinz, m.chat, saved.audioBuf, saved.visualBuf);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            } catch (err) {
                console.error('saudio error:', err?.message || err);
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal membuat Sticker Audio:\n${String(err?.message || err).slice(0, 300)}`);
            }
            return true;
        }

        if (saved.audioBuf || saved.visualBuf) {
            stickerAudio.setSession(m.sender, saved);
            if (videoNoAudioNotice && saved.visualBuf) {
                return Reply(`⚠️ Video tersebut tidak memiliki track audio.\nVisual stiker dari video sudah disimpan — sekarang kirim atau reply *audio/VN* dengan *${pfx}saudio*.\n⏳ Sesi berlaku 5 menit.`);
            }
            if (saved.audioBuf) {
                return Reply(`✅ Audio tersimpan.\nSekarang kirim atau reply *gambar/stiker/video* dengan *${pfx}saudio*.\n⏳ Sesi berlaku 5 menit.`);
            }
            return Reply(`✅ Gambar/stiker tersimpan.\nSekarang kirim atau reply *audio/VN* dengan *${pfx}saudio*.\n⏳ Sesi berlaku 5 menit.`);
        }

        return Reply(helpText);
    }
};
