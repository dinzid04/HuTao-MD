function getMenfessStore(Dinz, botCtx) {
    const raw = botCtx.getSection('menfess_pro', Dinz);
    if (!raw || typeof raw !== 'object') {
        return { sessions: {}, blocked: {}, aliases: {}, banned: [] };
    }
    return {
        sessions: raw.sessions && typeof raw.sessions === 'object' ? raw.sessions : {},
        blocked: raw.blocked && typeof raw.blocked === 'object' ? raw.blocked : {},
        aliases: raw.aliases && typeof raw.aliases === 'object' ? raw.aliases : {},
        banned: Array.isArray(raw.banned) ? raw.banned : []
    };
}

function saveMenfessStore(Dinz, botCtx, data) {
    botCtx.setSection('menfess_pro', data, Dinz);
}

module.exports = {
    name: 'menfess-suite',
    category: 'fun',
    commands: [
        'menfess', 'balasmenfess', 'menfessku', 'cekmenfess',
        'tarikmenfess', 'tolakmenfess',
        'blokmenfess', 'unblokmenfess',
        'lapormenfess', 'samaranmenfess', 'banmenfess'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, isCreator, Reply, botCtx, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const store = getMenfessStore(Dinz, botCtx);

        if (cmd === 'balasmenfess') {
            const parts = String(text || '').split('|');
            const rawId = String(parts[0] || '').replace(/^#/, '').trim();
            const replyBody = parts.slice(1).join('|').trim();
            if (!rawId || !replyBody) {
                return Reply(`💌 Format balas menfess:\n> \`${pfx}balasmenfess <id> | Isi balasan\``);
            }
            const sess = store.sessions[rawId];
            if (!sess || (sess.to !== m.sender && sess.from !== m.sender)) {
                return Reply(`❌ Sesi menfess \`#${rawId}\` tidak ditemukan atau bukan milikmu.`);
            }
            const dest = sess.to === m.sender ? sess.from : sess.to;
            const senderLabel = sess.to === m.sender ? 'Penerima Menfess' : sess.alias;
            await Dinz.sendMessage(dest, {
                text:
                    `\`💌 BALASAN MENFESS (#${sess.id})\`\n` +
                    `> ◦ *Dari :* ${senderLabel}\n\n` +
                    `💬 *Balasan:*\n"${replyBody}"\n\n` +
                    `> 💡 Balas lagi: \`${pfx}balasmenfess ${sess.id} | pesan\``
            });
            sess.status = 'dibalas';
            saveMenfessStore(Dinz, botCtx, store);
            return Reply(`✅ Balasan menfess \`#${sess.id}\` berhasil dikirim!`);
        }

        if (cmd === 'samaranmenfess') {
            const alias = String(text || '').trim().slice(0, 24);
            if (!alias) return Reply(`🎭 Atur nama samaran menfess kamu:\n> \`${pfx}samaranmenfess Pengagum Rahasia\``);
            store.aliases[m.sender] = alias;
            saveMenfessStore(Dinz, botCtx, store);
            return Reply(`✅ Nama samaran menfess kamu diatur menjadi: *${alias}*`);
        }

        if (cmd === 'blokmenfess' || cmd === 'unblokmenfess') {
            store.blocked[m.sender] = cmd === 'blokmenfess';
            saveMenfessStore(Dinz, botCtx, store);
            return Reply(cmd === 'blokmenfess'
                ? `🚫 Kamu menolak semua pesan menfess masuk. Aktifkan kembali dengan \`${pfx}unblokmenfess\`.`
                : '✅ Kamu sekarang bisa menerima pesan menfess kembali.');
        }

        if (cmd === 'banmenfess') {
            if (!isCreator) return Reply(global.mess.owner);
            let num = String(args[0] || '').replace(/[^0-9]/g, '');
            if (num.startsWith('08')) num = '62' + num.slice(1);
            if (!num) {
                return Reply(`🚫 Banned Menfess (${store.banned.length}): ${store.banned.join(', ') || 'Kosong'}\n> Ban/Unban: \`${pfx}banmenfess 628xxx\``);
            }
            const jid = `${num}@s.whatsapp.net`;
            if (store.banned.includes(jid)) {
                store.banned = store.banned.filter((x) => x !== jid);
                saveMenfessStore(Dinz, botCtx, store);
                return Reply(`✅ Nomor +${num} di-unban dari fitur Menfess.`);
            } else {
                store.banned.push(jid);
                saveMenfessStore(Dinz, botCtx, store);
                return Reply(`🚫 Nomor +${num} diban dari mengirim Menfess.`);
            }
        }

        if (cmd === 'menfessku' || cmd === 'cekmenfess') {
            const mine = Object.values(store.sessions).filter((s) => s.from === m.sender || s.to === m.sender);
            if (!mine.length) return Reply(`💌 Belum ada sesi menfess aktif untukmu.\n> Kirim menfess di private chat: \`${pfx}menfess 628xxx | Halo!\``);
            const rows = mine.slice(-8).map((s) => {
                const role = s.from === m.sender ? `Ke +${s.to.split('@')[0]}` : `Dari *${s.alias}*`;
                return `> ◦ ID \`#${s.id}\` — ${role} (${s.status})`;
            });
            return Reply(`\`💌 SESI MENFESS KAMU (${mine.length})\`\n${rows.join('\n')}`);
        }

        if (cmd === 'tarikmenfess' || cmd === 'tolakmenfess' || cmd === 'lapormenfess') {
            const id = String(args[0] || '').replace(/^#/, '').trim();
            const sess = id
                ? store.sessions[id]
                : Object.values(store.sessions).reverse().find((s) => s.from === m.sender || s.to === m.sender);
            if (!sess) return Reply(`❌ Sesi menfess tidak ditemukan. Cek ID di \`${pfx}menfessku\`.`);

            if (cmd === 'tarikmenfess' && sess.from === m.sender) {
                if (sess.sentKey) {
                    await Dinz.sendMessage(sess.to, { delete: sess.sentKey }).catch(() => {});
                }
                delete store.sessions[sess.id];
                saveMenfessStore(Dinz, botCtx, store);
                return Reply(`🗑️ Menfess \`#${sess.id}\` berhasil ditarik/dihentikan.`);
            }
            if (cmd === 'tolakmenfess' && sess.to === m.sender) {
                await Dinz.sendMessage(sess.from, { text: `💔 Penerima menutup sesi menfess \`#${sess.id}\`.` }).catch(() => {});
                delete store.sessions[sess.id];
                saveMenfessStore(Dinz, botCtx, store);
                return Reply(`✅ Sesi menfess \`#${sess.id}\` ditutup.`);
            }
            if (cmd === 'lapormenfess' && sess.to === m.sender) {
                const ownerNum = String(global.owner || '').replace(/[^0-9]/g, '');
                if (ownerNum) {
                    await Dinz.sendMessage(`${ownerNum}@s.whatsapp.net`, {
                        text: `\`🚨 LAPORAN MENFESS #${sess.id}\`\n> ◦ Pelapor : @${m.sender.split('@')[0]}\n> ◦ Pengirim Asli : @${sess.from.split('@')[0]}\n> ◦ Isi : ${sess.message}`,
                        mentions: [m.sender, sess.from]
                    }).catch(() => {});
                }
                delete store.sessions[sess.id];
                saveMenfessStore(Dinz, botCtx, store);
                return Reply('✅ Laporan menfess telah diteruskan ke Owner dan sesi ditutup.');
            }
            return Reply('❌ Kamu tidak memiliki akses pada sesi menfess tersebut.');
        }

        // .menfess 628xxx | Pesan
        if (m.isGroup) return Reply('🔒 Kirim menfess hanya lewat *Private Chat* bot agar identitasmu tetap rahasia!');
        if (store.banned.includes(m.sender)) return Reply('🚫 Akun kamu diblokir dari fitur Menfess.');

        const parts = String(text || '').split('|');
        let targetNum = String(parts[0] || '').replace(/[^0-9]/g, '');
        if (targetNum.startsWith('08')) targetNum = '62' + targetNum.slice(1);
        const msgBody = parts.slice(1).join('|').trim();
        if (!targetNum || !msgBody) {
            return Reply(
                `\`💌 KIRIM MENFESS ANONIM\`\n` +
                `> ◦ *Format :* \`${pfx}menfess 628xxx | Isi pesan\`\n` +
                `> ◦ *Samaran :* \`${pfx}samaranmenfess <nama>\`\n` +
                `> ◦ *Kelola :* \`${pfx}menfessku\`, \`${pfx}tarikmenfess\`, \`${pfx}blokmenfess\``
            );
        }

        const targetJid = `${targetNum}@s.whatsapp.net`;
        if (store.blocked[targetJid]) {
            return Reply('🚫 Penerima sedang menonaktifkan penerimaan pesan menfess.');
        }

        const id = String(Math.floor(1000 + Math.random() * 9000));
        const alias = store.aliases[m.sender] || 'Seseorang (Anonim)';
        const card =
            `\`💌 PESAN MENFESS MASUK (#${id})\`\n` +
            `> ◦ *Dari :* ${alias}\n\n` +
            `💬 *Pesan:*\n"${msgBody}"\n\n` +
            `> 💡 Balas: \`${pfx}balasmenfess ${id} | pesan balasan\`\n` +
            `> 🛑 Tutup: \`${pfx}tolakmenfess ${id}\` | Lapor: \`${pfx}lapormenfess ${id}\``;

        const sent = await Dinz.sendMessage(targetJid, { text: card });
        store.sessions[id] = {
            id,
            from: m.sender,
            to: targetJid,
            alias,
            message: msgBody.slice(0, 500),
            status: 'terkirim',
            sentKey: sent?.key || null,
            createdAt: Date.now()
        };
        saveMenfessStore(Dinz, botCtx, store);
        return Reply(`✅ Menfess \`#${id}\` berhasil dikirim secara anonim ke *+${targetNum}*!`);
    }
};
