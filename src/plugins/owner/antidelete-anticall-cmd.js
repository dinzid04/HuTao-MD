const fs = require('fs');
const path = require('path');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');
const antiDelCall = require('../../services/antidelete-anticall');

module.exports = {
    name: 'antidelete-anticall-cmd',
    category: 'owner',
    commands: [
        'antidelete', 'antiremove',
        'anticall',
        'autobio',
        'autoreactsw',
        'clearcache', 'clearsessions',
        'buatgrup', 'creategc',
        'ban', 'unban', 'listban',
        'bcpc', 'bcgc'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, isCreator, Reply, botCtx, usedPrefix } = ctx;
        if (!isCreator) return Reply(global.mess.owner);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        if (!global.db.settings) global.db.settings = {};

        const persistNow = async () => {
            global.db.settings._updatedAt = Date.now();
            if (typeof botCtx?.saveSettingsNow === 'function') {
                await botCtx.saveSettingsNow().catch(() => botCtx.saveRootDb());
            } else if (botCtx?.saveRootDb) {
                botCtx.saveRootDb();
            }
        };

        // 1. ANTIDELETE ON / OFF
        if (cmd === 'antidelete' || cmd === 'antiremove') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on' || sub === 'enable' || sub === 'aktif') {
                global.db.settings.antidelete = true;
                await persistNow();
                return Reply(
                    `✅ *Anti-Delete diaktifkan!*\n` +
                    `> ◦ Pesan grup yang dihapus akan dikirim ke Owner lengkap dengan *Nama Grup, Kontak Penghapus, Nama & Isi/Media*.\n` +
                    `> ◦ Pesan private chat yang dihapus juga dikirim ke Owner dengan format khusus Private Chat.`
                );
            }
            if (sub === 'off' || sub === 'disable' || sub === 'mati') {
                global.db.settings.antidelete = false;
                antiDelCall.clearAntiDeleteCache();
                await persistNow();
                return Reply('🔴 *Anti-Delete dinonaktifkan* dan cache pesan dibersihkan.');
            }
            const on = global.db.settings.antidelete === true;
            const st = antiDelCall.getCacheStats();
            return Reply(formatCard({
                icon: '🗑️',
                title: 'PENGATURAN ANTI-DELETE PESAN',
                rows: [
                    { label: 'Status', value: on ? '🟢 ON (Aktif)' : '🔴 OFF (Nonaktif)' },
                    { label: 'Cache Ringan', value: `${st.antideleteCached} pesan (0 buffer RAM)` }
                ],
                body:
                    `◦ ${toMono(`${pfx}antidelete on`)} — aktifkan laporan pesan dihapus ke DM Owner (Grup & Private)\n` +
                    `◦ ${toMono(`${pfx}antidelete off`)} — matikan fitur`
            }));
        }

        // 2. ANTICALL ON / OFF / BLOCK (Telepon Suara & Video Call!)
        if (cmd === 'anticall') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on' || sub === 'reject' || sub === 'aktif') {
                global.db.settings.anticall = 'reject';
                await persistNow();
                return Reply(
                    `✅ *Anti-Call diaktifkan (Mode Tolak Otomatis)!*\n` +
                    `> ◦ Menolak otomatis **Telepon Suara (Biasa)** maupun **Video Call**.\n` +
                    `> ◦ Mengirim peringatan ke penelpon & laporan detail ke Owner.\n` +
                    `> 💡 Gunakan \`${pfx}anticall block\` jika ingin sekaligus memblokir penelpon otomatis.`
                );
            }
            if (sub === 'block' || sub === 'blokir') {
                global.db.settings.anticall = 'block';
                await persistNow();
                return Reply(
                    `🚫 *Anti-Call diaktifkan (Mode Tolak + Auto-Block)!*\n` +
                    `> ◦ Semua **Telepon Suara** & **Video Call** masuk akan langsung ditolak, diberi peringatan, diblokir otomatis, dan dilaporkan ke Owner.`
                );
            }
            if (sub === 'off' || sub === 'disable' || sub === 'mati') {
                global.db.settings.anticall = false;
                await persistNow();
                return Reply('🔴 *Anti-Call dinonaktifkan.*');
            }
            const cur = global.db.settings.anticall;
            const label = cur === 'block' ? '🟢 ON (Tolak + Blokir)' : (cur ? '🟢 ON (Tolak Otomatis)' : '🔴 OFF');
            return Reply(formatCard({
                icon: '📵',
                title: 'PENGATURAN ANTI-CALL (SUARA & VIDEO)',
                rows: [{ label: 'Status', value: label }],
                body:
                    `◦ ${toMono(`${pfx}anticall on`)} — tolak otomatis panggilan suara & video\n` +
                    `◦ ${toMono(`${pfx}anticall block`)} — tolak otomatis + blokir penelpon\n` +
                    `◦ ${toMono(`${pfx}anticall off`)} — matikan fitur`
            }));
        }

        // 3. AUTOBIO ON / OFF
        if (cmd === 'autobio') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on' || sub === 'off') {
                global.db.settings.autobio = sub === 'on';
                await persistNow();
                return Reply(`${sub === 'on' ? '✅ *Auto-Bio diaktifkan!*' : '🔴 *Auto-Bio dinonaktifkan.*'}`);
            }
            return Reply(`📌 Status Auto-Bio: *${global.db.settings.autobio ? '🟢 ON' : '🔴 OFF'}*\n> Ketik \`${pfx}autobio on/off\``);
        }

        // 4. AUTOREACTSW ON / OFF [EMOJI]
        if (cmd === 'autoreactsw') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'off' || sub === 'mati') {
                global.db.settings.autoreactsw = false;
                await persistNow();
                return Reply('🔴 *Auto-React Status WA dinonaktifkan.*');
            }
            if (sub === 'on' || args[0]) {
                const emoji = (sub === 'on' ? (args[1] || '❤️') : args[0]).trim();
                global.db.settings.autoreactsw = emoji;
                global.db.settings.readsw = true;
                await persistNow();
                return Reply(`✅ *Auto-React SW aktif!* Bot otomatis react *${emoji}* ke story kontak.`);
            }
            return Reply(`📌 Status Auto-React SW: *${global.db.settings.autoreactsw ? `🟢 ON (${global.db.settings.autoreactsw})` : '🔴 OFF'}*\n> Contoh: \`${pfx}autoreactsw on 🔥\` atau \`${pfx}autoreactsw off\``);
        }

        // 5. CLEARCACHE & CLEARSESSIONS (Optimasi RAM & Disk aman tanpa hapus login!)
        if (cmd === 'clearcache') {
            let deletedTmp = 0;
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (fs.existsSync(tmpDir)) {
                for (const f of fs.readdirSync(tmpDir)) {
                    try { fs.rmSync(path.join(tmpDir, f), { recursive: true, force: true }); deletedTmp++; } catch (_) {}
                }
            }
            if (global._baileysSentCache instanceof Map) global._baileysSentCache.clear();
            if (typeof global.gc === 'function') global.gc();
            const rss = (process.memoryUsage().rss / 1048576).toFixed(1);
            return Reply(`🧹 *Cache berhasil dibersihkan!*\n> ◦ File \`./tmp\` dihapus : *${deletedTmp} file*\n> ◦ RAM aktif saat ini : *${rss} MB*`);
        }

        if (cmd === 'clearsessions') {
            if (Dinz.isJadibot) return Reply('🔒 Khusus Owner Bot Utama.');
            const sessDir = path.join(process.cwd(), 'session');
            let removed = 0;
            if (fs.existsSync(sessDir)) {
                const files = fs.readdirSync(sessDir);
                const preKeys = files.filter((f) => f.startsWith('pre-key-')).sort();
                // Sisakan 35 pre-key terbaru & creds.json agar sesi login & E2EE tetap 100% aman!
                const dropPreKeys = new Set(preKeys.slice(0, Math.max(0, preKeys.length - 35)));
                for (const f of files) {
                    if (f === 'creds.json') continue;
                    if (f.startsWith('app-state-sync-version-') || dropPreKeys.has(f)) {
                        try { fs.unlinkSync(path.join(sessDir, f)); removed++; } catch (_) {}
                    }
                }
            }
            return Reply(`🧹 *Pembersihan Session Aman Selesai!*\n> ◦ File sampah dihapus : *${removed} file*\n> ◦ \`creds.json\` & kunci aktif tetap aman (tidak logout).`);
        }

        // 6. BUATGRUP
        if (cmd === 'buatgrup' || cmd === 'creategc') {
            const title = String(text || '').trim();
            if (!title) return Reply(`👥 Contoh: \`${pfx}buatgrup Grup Diskusi HuTao\``);
            const created = await Dinz.groupCreate(title, [m.sender]);
            const code = await Dinz.groupInviteCode(created.id).catch(() => '');
            return Reply(
                `✅ *Grup berhasil dibuat!*\n` +
                `> ◦ *Nama :* ${title}\n` +
                `> ◦ *ID :* \`${created.id}\`\n` +
                (code ? `> ◦ *Link :* https://chat.whatsapp.com/${code}` : '')
            );
        }

        // 7. BAN / UNBAN / LISTBAN USER
        if (cmd === 'ban' || cmd === 'unban' || cmd === 'listban') {
            if (!Array.isArray(global.db.settings.bannedUsers)) global.db.settings.bannedUsers = [];
            const list = global.db.settings.bannedUsers;
            if (cmd === 'listban') {
                if (!list.length) return Reply('✅ Tidak ada user yang sedang diban.');
                const rows = list.map((j, i) => `> *${i + 1}.* @${j.split('@')[0]}`);
                return Reply(`\`🚫 DAFTAR USER BANNED (${list.length})\`\n${rows.join('\n')}`, list);
            }
            let target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || '';
            if (!target && args[0]) {
                let num = String(args[0]).replace(/[^0-9]/g, '');
                if (num.startsWith('08')) num = '62' + num.slice(1);
                if (num) target = `${num}@s.whatsapp.net`;
            }
            if (!target) return Reply(`🚫 Tag/reply atau tulis nomor: \`${pfx}${cmd} 628xxx\``);
            if (cmd === 'ban') {
                if (!list.includes(target)) list.push(target);
                await persistNow();
                return Reply(`🚫 @${target.split('@')[0]} berhasil diban dari penggunaan bot.`, [target]);
            } else {
                global.db.settings.bannedUsers = list.filter((x) => x !== target);
                await persistNow();
                return Reply(`✅ @${target.split('@')[0]} berhasil di-unban.`, [target]);
            }
        }

        // 8. BCPC / BCGC (Broadcast cepat Owner)
        if (cmd === 'bcpc' || cmd === 'bcgc') {
            const msgText = String(text || m.quoted?.text || '').trim();
            if (!msgText) return Reply(`📢 Contoh: \`${pfx}${cmd} Halo semuanya!\``);
            let targets = [];
            if (cmd === 'bcpc') {
                targets = Object.keys(global.db?.users || {}).filter((j) => j.endsWith('@s.whatsapp.net')).slice(0, 150);
            } else {
                const groups = await Dinz.groupFetchAllParticipating().catch(() => ({}));
                targets = Object.keys(groups);
            }
            await Reply(`⏳ Mengirim broadcast ke *${targets.length}* ${cmd === 'bcpc' ? 'chat pribadi' : 'grup'}...`);
            let ok = 0;
            for (const jid of targets) {
                try {
                    await Dinz.sendMessage(jid, { text: `\`📢 BROADCAST OWNER\`\n\n${msgText}` });
                    ok++;
                } catch (_) {}
                await new Promise((r) => setTimeout(r, 1500));
            }
            return Reply(`✅ Broadcast selesai! Terkirim ke *${ok}/${targets.length}* tujuan.`);
        }

        return true;
    }
};
