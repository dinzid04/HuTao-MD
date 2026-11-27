const crypto = require('crypto');
const { formatCard, toMono } = require('../../utils/formatter');

function getStickerHashFromMsg(msgObj) {
    if (!msgObj) return '';
    const st = msgObj.stickerMessage || msgObj.msg?.stickerMessage || (msgObj.mimetype === 'image/webp' ? msgObj : null);
    const sha = st?.fileSha256 || msgObj?.fileSha256;
    if (sha) {
        return Buffer.isBuffer(sha) ? sha.toString('base64') : Buffer.from(sha).toString('base64');
    }
    return '';
}

function getStickerCmdMap(Dinz, botCtx) {
    const raw = botCtx.getSection('cmd_stickers', Dinz);
    return raw && typeof raw === 'object' ? raw : {};
}

function saveStickerCmdMap(Dinz, botCtx, data) {
    botCtx.setSection('cmd_stickers', data, Dinz);
}

function resolveIncomingStickerCommand(Dinz, m, botCtx) {
    try {
        if (!m || m.type !== 'stickerMessage') return null;
        const hash = getStickerHashFromMsg(m.message?.stickerMessage);
        if (!hash) return null;
        const map = getStickerCmdMap(Dinz, botCtx);
        return map[hash]?.command || null;
    } catch (_) {
        return null;
    }
}

function isGroupSelfMuted(m, isCreator) {
    if (!m?.isGroup || isCreator || m.isAdmin) return false;
    const grp = global.db?.groups?.[m.chat];
    return Boolean(grp && grp.selfThisGc === true);
}

async function handleGroupAutoReply(Dinz, m, body, botCtx) {
    try {
        if (!m?.isGroup || m.fromMe || !body) return false;
        const grp = global.db?.groups?.[m.chat];
        if (!grp || grp.autoReplyEnabled === false || !grp.autoReplies || typeof grp.autoReplies !== 'object') return false;
        const key = String(body).trim().toLowerCase();
        const resp = grp.autoReplies[key];
        if (!resp) return false;
        await Dinz.sendMessage(m.chat, { text: resp }, { quoted: m });
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = {
    name: 'group-extra',
    category: 'group',
    commands: [
        'acc', 'approve',
        'setppgc', 'delppgc', 'getppgc',
        'pinchat', 'unpinchat',
        'autoreply',
        'addcmdsticker', 'delcmdsticker', 'listcmdsticker',
        'cekidgc', 'selfthisgc', 'publicthisgc'
    ],
    resolveIncomingStickerCommand,
    isGroupSelfMuted,
    handleGroupAutoReply,

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, mime, isCreator, Reply, botCtx, pluginLoader, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        // 1. STICKER TO COMMAND (works in group & private for Owner/Admin)
        if (cmd === 'addcmdsticker' || cmd === 'delcmdsticker' || cmd === 'listcmdsticker') {
            const map = getStickerCmdMap(Dinz, botCtx);

            if (cmd === 'listcmdsticker') {
                const entries = Object.entries(map);
                if (!entries.length) return Reply(`🖼️ Belum ada shortcut stiker aktif.\n> Tambah: reply stiker dengan \`${pfx}addcmdsticker menu\``);
                const rows = entries.map(([h, v], i) => `> *${i + 1}.* \`${h.slice(0, 10)}...\` ➔ \`${pfx}${v.command}\``);
                return Reply(`\`🖼️ DAFTAR STICKER COMMAND (${entries.length})\`\n${rows.join('\n')}`);
            }

            if (!isCreator && !(m.isGroup && m.isAdmin)) {
                return Reply(global.mess.admin);
            }

            const qRaw = m.quoted?.msg || m.quoted || null;
            const hash = getStickerHashFromMsg(qRaw);

            if (cmd === 'delcmdsticker') {
                if (hash && map[hash]) {
                    const old = map[hash].command;
                    delete map[hash];
                    saveStickerCmdMap(Dinz, botCtx, map);
                    return Reply(`🗑️ Shortcut stiker untuk \`${pfx}${old}\` berhasil dihapus.`);
                }
                const targetCmd = String(args[0] || '').toLowerCase().replace(/^\./, '');
                const found = Object.keys(map).find((k) => map[k]?.command === targetCmd);
                if (!found) return Reply(`⚠️ Reply stiker shortcut atau ketik \`${pfx}delcmdsticker <nama_command>\`.`);
                delete map[found];
                saveStickerCmdMap(Dinz, botCtx, map);
                return Reply(`🗑️ Shortcut stiker untuk \`${pfx}${targetCmd}\` berhasil dihapus.`);
            }

            const targetCmd = String(args[0] || '').toLowerCase().replace(/^[^a-z0-9]+/i, '');
            const targetArgs = args.slice(1).join(' ');
            if (!hash || !targetCmd) {
                return Reply(`🖼️ Reply sebuah *stiker* lalu ketik:\n> \`${pfx}addcmdsticker menu\``);
            }
            const validSet = pluginLoader.getValidCommandsSet ? pluginLoader.getValidCommandsSet() : new Set(pluginLoader.getValidCommands());
            if (!validSet.has(targetCmd)) {
                return Reply(`❌ Command \`${targetCmd}\` tidak ditemukan di daftar fitur bot.`);
            }
            map[hash] = {
                command: targetArgs ? `${targetCmd} ${targetArgs}` : targetCmd,
                by: m.sender,
                at: Date.now()
            };
            saveStickerCmdMap(Dinz, botCtx, map);
            return Reply(`✅ *Sticker Command Aktif!*\n> 🖼️ Kirim stiker tersebut kapan saja untuk menjalankan \`${pfx}${map[hash].command}\`.`);
        }

        // Remaining commands require Group context
        if (!m.isGroup) return Reply(global.mess.group);
        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
        const grp = global.db.groups[m.chat];

        if (cmd === 'cekidgc') {
            return Reply(formatCard({
                icon: '🆔',
                title: 'INFORMASI ID GRUP',
                rows: [
                    { label: 'Nama Grup', value: m.metadata?.subject || '-' },
                    { label: 'ID Grup', value: m.chat },
                    { label: 'Member', value: `${m.metadata?.participants?.length || 0} orang` }
                ]
            }));
        }

        if (cmd === 'getppgc') {
            const url = await Dinz.profilePictureUrl(m.chat, 'image').catch(() => null);
            if (!url) return Reply('❌ Grup ini belum memasang foto profil.');
            await Dinz.sendMessage(m.chat, { image: { url }, caption: `🖼️ *Foto Profil Grup:* ${m.metadata?.subject || ''}` }, { quoted: m });
            return true;
        }

        // Admin-only group commands below
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (cmd === 'selfthisgc' || cmd === 'publicthisgc') {
            grp.selfThisGc = cmd === 'selfthisgc';
            botCtx.saveRootDb();
            return Reply(cmd === 'selfthisgc'
                ? '🔒 *Mode Self Grup Aktif!* Hanya Admin Grup & Owner yang dapat memakai command bot di grup ini.'
                : '🌐 *Mode Public Grup Aktif!* Semua member di grup ini dapat memakai command bot kembali.');
        }

        if (cmd === 'autoreply') {
            if (!grp.autoReplies) grp.autoReplies = {};
            const sub = (args[0] || '').toLowerCase();
            const rest = args.slice(1).join(' ').trim();

            if (sub === 'add') {
                const [trig, ...ansParts] = rest.split('|');
                const trigger = String(trig || '').trim().toLowerCase();
                const answer = ansParts.join('|').trim();
                if (!trigger || !answer) return Reply(`💬 Contoh: \`${pfx}autoreply add info | Halo kak, silakan cek deskripsi grup ya!\``);
                grp.autoReplies[trigger] = answer;
                grp.autoReplyEnabled = true;
                botCtx.saveRootDb();
                return Reply(`✅ Auto-reply ditambahkan!\n> Trigger: *"${trigger}"*\n> Balasan: ${answer}`);
            }
            if (sub === 'del' || sub === 'hapus') {
                const trigger = rest.toLowerCase();
                if (!grp.autoReplies[trigger]) return Reply(`❌ Trigger *"${trigger}"* tidak ditemukan.`);
                delete grp.autoReplies[trigger];
                botCtx.saveRootDb();
                return Reply(`🗑️ Trigger auto-reply *"${trigger}"* dihapus.`);
            }
            if (sub === 'on' || sub === 'off') {
                grp.autoReplyEnabled = sub === 'on';
                botCtx.saveRootDb();
                return Reply(`📌 Auto-reply grup sekarang: *${sub.toUpperCase()}*`);
            }
            const keys = Object.keys(grp.autoReplies);
            return Reply(
                `\`💬 AUTO-REPLY GRUP (${grp.autoReplyEnabled === false ? 'OFF' : 'ON'})\`\n` +
                (keys.length ? keys.map((k, i) => `> *${i + 1}.* \`${k}\` ➔ ${grp.autoReplies[k].slice(0, 50)}`).join('\n') : '> _(Belum ada kata kunci)_') +
                `\n\n> Tambah: \`${pfx}autoreply add kata | balasan\`\n> Hapus: \`${pfx}autoreply del kata\`\n> Toggle: \`${pfx}autoreply on/off\``
            );
        }

        if (!m.isBotAdmin && !isCreator) return Reply(global.mess.botAdmin);

        if (cmd === 'acc' || cmd === 'approve') {
            const sub = cmd === 'approve' && (!args[0] || args[0] === 'all' || /^\d/.test(args[0]))
                ? 'approve'
                : (args[0] || '').toLowerCase();
            const opt = cmd === 'approve' && sub === 'approve' && args[0] !== 'approve'
                ? args.join(' ').trim()
                : args.slice(1).join(' ').trim();

            if (!['list', 'approve', 'reject'].includes(sub)) {
                return Reply(
                    `\`📋 KELOLA PERMINTAAN MASUK GRUP\`\n` +
                    `> ◦ ${toMono(`${pfx}acc list`)} — lihat daftar tunggu\n` +
                    `> ◦ ${toMono(`${pfx}acc approve all`)} — terima semua\n` +
                    `> ◦ ${toMono(`${pfx}acc reject all`)} — tolak semua\n` +
                    `> ◦ ${toMono(`${pfx}acc approve 1|2`)} — terima nomor tertentu`
                );
            }

            const pending = await Dinz.groupRequestParticipantsList(m.chat).catch(() => []);
            if (!pending || !pending.length) return Reply('📭 Tidak ada permintaan bergabung yang tertunda di grup ini.');

            if (sub === 'list') {
                const lines = pending.map((r, i) => `> *${i + 1}.* @${(r.jid || '').split('@')[0]}`);
                return Reply(
                    `\`📋 DAFTAR REQUEST JOIN (${pending.length})\`\n${lines.join('\n')}\n\n` +
                    `> Ketik \`${pfx}acc approve all\` untuk menerima semua.`,
                    pending.map((r) => r.jid).filter(Boolean)
                );
            }

            let targets = [];
            if (!opt || opt.toLowerCase() === 'all') {
                targets = pending.map((r) => r.jid).filter(Boolean);
            } else {
                const idxs = opt.split(/[|,.\s]+/).map((n) => parseInt(n, 10) - 1).filter((n) => n >= 0 && n < pending.length);
                targets = idxs.map((i) => pending[i]?.jid).filter(Boolean);
            }
            if (!targets.length) return Reply(`❌ Pilih nomor valid dari \`${pfx}acc list\` atau gunakan \`all\`.`);

            const res = await Dinz.groupRequestParticipantsUpdate(m.chat, targets, sub);
            const okCount = Array.isArray(res) ? res.filter((x) => !x.status || String(x.status) === '200').length : targets.length;
            return Reply(`✅ Berhasil *${sub === 'approve' ? 'menerima' : 'menolak'}* *${okCount}/${targets.length}* permintaan masuk grup!`);
        }

        if (cmd === 'setppgc') {
            if (!/image/.test(mime)) return Reply(`🖼️ Reply atau kirim foto dengan caption \`${pfx}setppgc\`.`);
            const buf = await quoted.download();
            await Dinz.updateProfilePicture(m.chat, buf);
            return Reply('✅ Foto profil grup berhasil diperbarui!');
        }

        if (cmd === 'delppgc') {
            await Dinz.removeProfilePicture(m.chat);
            return Reply('🗑️ Foto profil grup berhasil dihapus.');
        }

        if (cmd === 'pinchat' || cmd === 'unpinchat') {
            if (!m.quoted?.key) return Reply(`📌 Reply pesan yang ingin di-${cmd === 'pinchat' ? 'pin' : 'unpin'}!`);
            const typeVal = cmd === 'pinchat' ? 1 : 2;
            await Dinz.sendMessage(m.chat, {
                pin: m.quoted.key,
                type: typeVal,
                time: 604800 // 7 hari
            });
            return Reply(cmd === 'pinchat' ? '📌 Pesan berhasil disematkan (7 hari)!' : '📌 Sematan pesan berhasil dilepas.');
        }

        return false;
    }
};
