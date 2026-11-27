const moment = require('moment-timezone');
const statusStore = require('../../services/status-store');

module.exports = {
    name: 'getsw',
    category: 'tools',
    commands: ['getsw', 'ambilsw', 'listsw', 'ceksw', 'swlist'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, usedPrefix, getTargetNumber } = ctx;
        const pfx = usedPrefix || '.';

        if (!isCreator) return Reply(global.mess.owner);
        const cmd = String(command || '').toLowerCase();

        if (['listsw', 'ceksw', 'swlist'].includes(cmd)) {
            const senders = statusStore.listAvailableSenders(Dinz);
            if (senders.length === 0) {
                return Reply(
                    `\`📱 DAFTAR STATUS WA (24 JAM)\`\n` +
                    `> ◦ Belum ada Status WhatsApp kontak yang tertangkap.\n\n` +
                    `ℹ️ *Catatan:*\n` +
                    `> • Bot hanya bisa menangkap SW dari nomor yang *saling simpan kontak* dengan nomor bot.\n` +
                    `> • SW otomatis tersimpan saat kontak mengunggah status ketika bot sedang online (tersimpan 24 jam).`
                );
            }

            const lines = senders.slice(0, 30).map((s, i) => {
                const parts = [];
                if (s.counts.image) parts.push(`${s.counts.image} Foto`);
                if (s.counts.video) parts.push(`${s.counts.video} Video`);
                if (s.counts.audio) parts.push(`${s.counts.audio} Audio`);
                if (s.counts.text) parts.push(`${s.counts.text} Teks`);
                const timeStr = s.lastTs ? moment(s.lastTs).tz('Asia/Jakarta').format('HH:mm') : '-';
                const idDisplay = s.phone || s.lid;
                return `> ${i + 1}. *${s.name}* (\`${idDisplay}\`)\n>    └ ${parts.join(', ')} • ${timeStr} WIB`;
            });

            return Reply(
                `\`📱 DAFTAR STATUS WA TERDETEKSI (${senders.length} Kontak)\`\n\n` +
                `${lines.join('\n')}\n\n` +
                `💡 *Ambil Status:* ketik \`${pfx}getsw <nomor>\`\n` +
                `> Contoh: \`${pfx}getsw ${senders[0].phone || senders[0].lid}\``
            );
        }

        // Command .getsw <nomor> [urutan]
        let rawTarget = '';
        let pickIndex = 0;

        const mentioned = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (args[0] && !args[0].startsWith('@')) {
            rawTarget = args[0];
            if (args[1] && /^\d+$/.test(args[1])) pickIndex = parseInt(args[1], 10);
        } else if (mentioned) {
            rawTarget = getTargetNumber(m, mentioned);
            const idxArg = args.find((a) => !a.startsWith('@') && /^\d{1,2}$/.test(a));
            if (idxArg) pickIndex = parseInt(idxArg, 10);
        }

        if (!rawTarget) {
            const senders = statusStore.listAvailableSenders(Dinz).slice(0, 5);
            const hintList = senders.length > 0
                ? `\n\n*📋 Kontak Dengan SW Aktif Terbaru:*\n` + senders.map((s, i) => `> ${i + 1}. ${s.name} — \`${pfx}getsw ${s.phone || s.lid}\` (${s.total} SW)`).join('\n')
                : '';
            return Reply(
                `\`📱 GET STATUS WHATSAPP (.getsw)\`\n` +
                `> ◦ *Format :* \`${pfx}getsw <nomor> [urutan]\`\n` +
                `> ◦ *Contoh :* \`${pfx}getsw 628123456789\`\n` +
                `> ◦ *Ambil ke-2 :* \`${pfx}getsw 628123456789 2\`\n` +
                `> ◦ *Lihat daftar SW :* \`${pfx}listsw\`${hintList}`
            );
        }

        const normNum = statusStore.normalizeDigits(rawTarget);
        const statuses = statusStore.getStatusesByNumber(Dinz, normNum);

        if (statuses.length === 0) {
            return Reply(
                `❌ Status WhatsApp dari *${normNum}* tidak ditemukan (dalam 24 jam terakhir).\n\n` +
                `ℹ️ *Pastikan:*\n` +
                `> 1. Nomor tersebut ada di kontak nomor bot & tidak memprivasi status dari bot.\n` +
                `> 2. Kontak tersebut mengunggah SW saat bot sedang online.\n` +
                `> 3. Ketik \`${pfx}listsw\` untuk melihat daftar kontak yang SW-nya sudah tertangkap.`
            );
        }

        let toSend = statuses;
        if (pickIndex > 0) {
            if (pickIndex > statuses.length) {
                return Reply(`❌ Kontak *${normNum}* hanya memiliki *${statuses.length}* status aktif (pilih 1 - ${statuses.length}).`);
            }
            toSend = [statuses[pickIndex - 1]];
        } else if (toSend.length > 10) {
            toSend = toSend.slice(-10);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        const contactLabel = statuses[statuses.length - 1]?.name || normNum;
        await Reply(`📥 Mengambil *${toSend.length}* Status WA dari *${contactLabel}* (\`${normNum}\`)...`);

        let sent = 0;
        let failed = 0;

        for (let i = 0; i < toSend.length; i++) {
            const st = toSend[i];
            const idxNum = pickIndex > 0 ? pickIndex : (statuses.indexOf(st) + 1);
            const timeStr = st.timestampMs ? moment(st.timestampMs).tz('Asia/Jakarta').format('DD/MM HH:mm [WIB]') : '-';
            const header =
                `\`📱 STATUS WA (${idxNum}/${statuses.length})\`\n` +
                `> ◦ *Dari :* ${st.name || contactLabel} (\`${st.phone || normNum}\`)\n` +
                `> ◦ *Waktu :* ${timeStr}`;

            try {
                if (st.kind === 'text') {
                    await Dinz.sendMessage(m.chat, {
                        text: `${header}\n> ◦ *Tipe :* Teks\n\n${st.text || '(kosong)'}`
                    }, { quoted: m });
                    sent++;
                } else {
                    const buf = await statusStore.downloadStatusMedia(st);
                    if (!buf || buf.length < 16) throw new Error('Media status sudah kadaluarsa di server WA');
                    const cap = st.text ? `${header}\n\n${st.text}` : header;
                    if (st.kind === 'image') {
                        await Dinz.sendMessage(m.chat, { image: buf, caption: cap }, { quoted: m });
                    } else if (st.kind === 'video') {
                        await Dinz.sendMessage(m.chat, {
                            video: buf,
                            mimetype: st.mimetype || 'video/mp4',
                            gifPlayback: Boolean(st.mediaNode?.gifPlayback),
                            caption: cap
                        }, { quoted: m });
                    } else if (st.kind === 'audio') {
                        await Dinz.sendMessage(m.chat, {
                            audio: buf,
                            mimetype: st.mimetype || 'audio/ogg; codecs=opus',
                            ptt: Boolean(st.mediaNode?.ptt)
                        }, { quoted: m });
                        await Dinz.sendMessage(m.chat, { text: `${header}\n> ◦ *Tipe :* Audio / Voice Note` }, { quoted: m });
                    }
                    sent++;
                }
            } catch (err) {
                failed++;
                console.log('[GetSW] Gagal ambil status:', err?.message || err);
            }
            if (i < toSend.length - 1) {
                await new Promise((r) => setTimeout(r, 700));
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: sent > 0 ? '✅' : '❌', key: m.key } }).catch(() => {});
        if (sent === 0) {
            return Reply(`❌ Gagal mengunduh media status (mungkin media sudah kadaluarsa atau dihapus oleh pemiliknya).`);
        }
        if (failed > 0) {
            return Reply(`✅ Berhasil mengambil *${sent}* status (${failed} gagal/kadaluarsa).`);
        }
        return true;
    }
};
