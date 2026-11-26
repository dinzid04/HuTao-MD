const { runRichGame } = require('./_helper');
const chessPvp = require('../../services/chess-pvp');
const { grantRandomGameReward } = require('../../services/game');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'chess',
    category: 'richgame',
    commands: ['chess', 'catur', 'chessrich', 'chesspvp'],

    async execute(ctx) {
        const { Dinz, m, args, Reply, botCtx, usedPrefix } = ctx;
        const identity = botCtx.getBotIdentity(Dinz);
        const botname = identity.botname || global.botname || 'HuTao - MD';
        const sub = (args[0] || '').toLowerCase().trim();

        if (!sub || sub === 'help') {
            return Reply(formatCard({
                icon: '♟️',
                title: 'RICH CATUR REALTIME CO-OP & AI',
                body:
                    `*Mode Main Bareng Teman (Rich HTML Realtime):*\n` +
                    `• \`${usedPrefix}chess @teman\` — buka papan Rich HTML Co-op & tantang teman\n` +
                    `• \`${usedPrefix}chess room\` — buat room Rich HTML (main bareng beda chat/jarak jauh!)\n` +
                    `• \`${usedPrefix}chess join <kode>\` — masuk room & terima papan Rich HTML lawan\n` +
                    `• \`${usedPrefix}chess board\` — kirim ulang papan Rich HTML posisi terbaru\n` +
                    `• \`${usedPrefix}chess moves e2\` — cek langkah legal bidak\n` +
                    `• \`${usedPrefix}chess resign\` — menyerah / tutup room\n\n` +
                    `*Mode Solo vs AI (Rich HTML):*\n` +
                    `• \`${usedPrefix}chess ai\` — buka papan catur Rich HTML melawan AI`,
                footer: 'Langsung klik bidak di papan Rich HTML (sync live antar HP) atau ketik e2e4!'
            }));
        }

        if (sub === 'ai' || sub === 'solo' || sub === 'rich') {
            return runRichGame(ctx, 'chess');
        }

        if (sub === 'room' || sub === 'pvp' || sub === 'coop' || sub === 'buat' || m.mentionedJid?.length > 0 || sub.startsWith('@')) {
            const existing = chessPvp.findActiveRoomForPlayer(Dinz, m.sender, m.chat);
            if (existing) {
                return Reply(`⚠️ Kamu masih berada di room \`${existing.code}\`. Ketik \`${usedPrefix}chess resign\` dulu jika ingin keluar.`);
            }
            const invited = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted ? m.quoted.sender : '');
            if (invited && chessPvp.cleanNum(invited) === chessPvp.cleanNum(m.sender)) {
                return Reply('❌ Tidak bisa menantang diri sendiri! Tag temanmu atau pakai `chess ai`.');
            }

            await Dinz.sendMessage(m.chat, { react: { text: '♟️', key: m.key } }).catch(() => {});
            const room = chessPvp.createChessRoom(Dinz, {
                whiteJid: m.sender,
                whiteName: m.pushName || chessPvp.cleanNum(m.sender),
                whiteChat: m.chat,
                invitedBlackJid: invited
            });

            chessPvp.startRoomRelayWatcher(Dinz, room, botname);
            const initialRole = m.isGroup ? 'auto' : 'w';

            try {
                await chessPvp.sendRichBoardToChat(Dinz, m.chat, room, { role: initialRole, botname });
            } catch (err) {
                console.error('[ChessRich] create send error:', err?.message || err);
            }

            if (invited) {
                return Reply(
                    `\`⌜ ♟️ RICH CATUR CO-OP REALTIME ⌟\`\n` +
                    `> ◦ *Room :* \`${room.code}\`\n` +
                    `> ◦ *Putih ⬜ :* @${chessPvp.cleanNum(m.sender)}\n` +
                    `> ◦ *Hitam ⬛ :* @${chessPvp.cleanNum(invited)}\n\n` +
                    `🔥 @${chessPvp.cleanNum(invited)} ketik \`${usedPrefix}chess acc\` (untuk mengunci hadiah RPG), lalu **langsung buka papan Rich HTML di atas** — Putih pilih *⬜ Putih*, Hitam pilih *⬛ Hitam*!`,
                    [m.sender, invited]
                );
            }

            return Reply(
                `\`⌜ ♟️ ROOM RICH CATUR CO-OP DIBUAT ⌟\`\n` +
                `> ◦ *Kode Room :* \`${room.code}\`\n` +
                `> ◦ *Putih ⬜ :* @${chessPvp.cleanNum(m.sender)}\n` +
                `> ◦ *Status :* Siap dimainkan di Rich HTML!\n\n` +
                `💡 *Main di chat berbeda / teman virtual:*\n` +
                `Kirim kode \`${room.code}\` ke temanmu, suruh dia ketik:\n` +
                `\`${usedPrefix}chess join ${room.code}\`\n` +
                `Papan Rich HTML kedua HP akan tersinkron otomatis secara realtime!`,
                [m.sender]
            );
        }

        if (sub === 'join' || sub === 'acc' || sub === 'terima') {
            const codeArg = args[1] || '';
            const room = codeArg ? chessPvp.getRoomByCode(Dinz, codeArg) : chessPvp.findWaitingRoomInChat(Dinz, m.chat);
            if (!room || room.status !== 'waiting') {
                return Reply(`❌ Room catur tidak ditemukan atau sudah dimulai. Buat baru dengan \`${usedPrefix}chess room\`.`);
            }
            if (chessPvp.cleanNum(room.whiteJid) === chessPvp.cleanNum(m.sender)) {
                return Reply('❌ Kamu pembuat room ini! Tunggu temanmu join.');
            }
            if (room.blackJid && chessPvp.cleanNum(room.blackJid) !== chessPvp.cleanNum(m.sender)) {
                return Reply(`❌ Room \`${room.code}\` khusus untuk @${chessPvp.cleanNum(room.blackJid)}.`, [room.blackJid]);
            }

            await Dinz.sendMessage(m.chat, { react: { text: '♟️', key: m.key } }).catch(() => {});
            room.blackJid = m.sender;
            room.blackName = m.pushName || chessPvp.cleanNum(m.sender);
            room.blackChat = m.chat;
            room.status = 'playing';
            room.updatedAt = Date.now();

            chessPvp.startRoomRelayWatcher(Dinz, room, botname);
            await chessPvp.publishRelayEvent(room, {
                t: 'hello',
                c: 'b',
                by: room.blackName
            });

            const cap =
                `\`⌜ ♟️ RICH CATUR REALTIME DIMULAI (${room.code}) ⌟\`\n` +
                `> ◦ *Putih ⬜ :* @${chessPvp.cleanNum(room.whiteJid)} (${room.whiteName})\n` +
                `> ◦ *Hitam ⬛ :* @${chessPvp.cleanNum(room.blackJid)} (${room.blackName})\n` +
                `> ◦ *Giliran :* Putih ⬜ (@${chessPvp.cleanNum(room.whiteJid)})\n\n` +
                `🎮 Buka papan **Rich HTML** untuk main realtime antar HP!\n` +
                `💡 Jika WebView WA mode offline, tetap bisa ketik langkah di chat (misal \`e2e4\`, \`Nf3\`, \`O-O\`).`;

            if (room.whiteChat === room.blackChat) {
                await chessPvp.sendRichBoardToChat(Dinz, m.chat, room, { role: 'auto', botname }).catch(() => {});
                await Reply(cap, [room.whiteJid, room.blackJid]);
            } else {
                await chessPvp.sendRichBoardToChat(Dinz, room.blackChat, room, { role: 'b', botname }).catch(() => {});
                await Dinz.sendMessage(room.blackChat, {
                    text: cap,
                    contextInfo: { mentionedJid: [room.whiteJid, room.blackJid] }
                }, { quoted: m }).catch(() => {});
                await Dinz.sendMessage(room.whiteChat, {
                    text: `🔥 *${room.blackName}* telah bergabung ke Room Rich Catur \`${room.code}\`! Buka papan Rich HTML-mu, sekarang giliran *Putih ⬜*!`,
                    contextInfo: { mentionedJid: [room.whiteJid, room.blackJid] }
                }).catch(() => {});
            }
            return true;
        }

        if (sub === 'board' || sub === 'papan') {
            const room = chessPvp.findActiveRoomForPlayer(Dinz, m.sender, m.chat);
            if (!room) return Reply('❌ Kamu tidak sedang berada di room catur aktif.');
            const sNum = chessPvp.cleanNum(m.sender);
            const role = room.whiteChat === room.blackChat ? 'auto' : (chessPvp.cleanNum(room.whiteJid) === sNum ? 'w' : 'b');
            const turnJid = room.turn === 'w' ? room.whiteJid : room.blackJid;
            await chessPvp.sendRichBoardToChat(Dinz, m.chat, room, { role, botname });
            await Reply(
                `\`⌜ ♟️ PAPAN RICH CATUR (${room.code}) ⌟\`\n> ◦ *Giliran :* ${room.turn === 'w' ? 'Putih ⬜' : 'Hitam ⬛'}${turnJid ? ` (@${chessPvp.cleanNum(turnJid)})` : ''}`,
                turnJid ? [turnJid] : []
            );
            return true;
        }

        if (sub === 'moves' || sub === 'cek') {
            const room = chessPvp.findActiveRoomForPlayer(Dinz, m.sender, m.chat);
            if (!room || room.status !== 'playing') return Reply('❌ Kamu tidak sedang berada di pertandingan catur aktif.');
            const sq = chessPvp.sqToRC(args[1]);
            if (!sq) return Reply(`❌ Contoh: \`${usedPrefix}chess moves e2\``);
            const all = chessPvp.getAllLegalMoves(room, room.turn).filter((mv) => mv.fr === sq.r && mv.fc === sq.c);
            if (!all.length) return Reply(`ℹ️ Tidak ada langkah legal dari petak *${args[1]}* untuk giliran *${room.turn === 'w' ? 'Putih' : 'Hitam'}*.`);
            const list = all.map((mv) => `${chessPvp.rcToSq(mv.fr, mv.fc)}${chessPvp.rcToSq(mv.tr, mv.tc)}`).join(', ');
            return Reply(`♟️ *Langkah legal dari ${args[1]}:*\n> ◦ ${list}`);
        }

        if (sub === 'resign' || sub === 'menyerah' || sub === 'stop' || sub === 'batal') {
            const room = chessPvp.findActiveRoomForPlayer(Dinz, m.sender, m.chat);
            if (!room) return Reply('❌ Kamu tidak memiliki room catur aktif.');
            const loserNum = chessPvp.cleanNum(m.sender);
            const loserColor = chessPvp.cleanNum(room.whiteJid) === loserNum ? 'w' : 'b';
            await chessPvp.publishRelayEvent(room, { t: 'resign', c: loserColor, src: 'bot' });
            chessPvp.deleteChessRoom(room);
            if (room.status === 'waiting') {
                return Reply(`🏳️ Room catur \`${room.code}\` dibatalkan.`);
            }
            const winnerJid = loserColor === 'w' ? room.blackJid : room.whiteJid;
            const reward = winnerJid ? grantRandomGameReward(winnerJid, 1.2) : null;
            const cap =
                `\`⌜ 🏳️ RICH CATUR SELESAI (MENYERAH) ⌟\`\n` +
                `> ◦ *Menyerah :* @${loserNum}\n` +
                (winnerJid ? `> ◦ *Pemenang :* @${chessPvp.cleanNum(winnerJid)}\n` : '') +
                (reward ? `> ◦ *Hadiah Random :*\n> ◦ ${reward.summary}` : '');
            const targets = [...new Set([room.whiteChat, room.blackChat].filter(Boolean))];
            for (const jid of targets) {
                await Dinz.sendMessage(jid, {
                    text: cap,
                    contextInfo: { mentionedJid: [m.sender, winnerJid].filter(Boolean) }
                }).catch(() => {});
            }
            return true;
        }

        if (sub === 'move' || sub === 'jalan') {
            const mvStr = args.slice(1).join(' ');
            const handled = await chessPvp.handleQuickChessMove(Dinz, m, mvStr, botname);
            if (!handled) return Reply(`❌ Kamu tidak sedang dalam pertandingan catur aktif atau langkah \`${mvStr}\` tidak valid.`);
            return true;
        }

        const directHandled = await chessPvp.handleQuickChessMove(Dinz, m, args.join(' '), botname);
        if (directHandled) return true;
        return Reply(`❌ Subcommand tidak dikenali. Ketik \`${usedPrefix}chess\` untuk melihat panduan.`);
    }
};
