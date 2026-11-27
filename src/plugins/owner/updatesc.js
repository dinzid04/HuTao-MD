const updater = require('../../services/updater');

module.exports = {
    name: 'updatesc',
    category: 'owner',
    commands: ['updatesc', 'updatebot', 'cekupdate', 'notifupdate'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, isMainOwner, Reply, database, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';

        if (Dinz && Dinz.isJadibot) {
            return Reply('🔒 Fitur update script hanya tersedia pada Bot Utama.');
        }
        if (!isCreator || !isMainOwner) return Reply(global.mess.owner);

        const sub = String(args[0] || '').trim().toLowerCase();

        if (command === 'notifupdate') {
            const rootDb = ctx.botCtx.getRootDb();
            if (!rootDb.settings) rootDb.settings = {};

            if (sub === 'on' || sub === 'aktif' || sub === '1') {
                rootDb.settings.notifUpdate = true;
                rootDb.settings._updatedAt = Date.now();
                if (typeof ctx.botCtx.saveSettingsNow === 'function') await ctx.botCtx.saveSettingsNow().catch(() => ctx.botCtx.saveRootDb());
                else ctx.botCtx.saveRootDb();
                // Catat baseline SHA saat ini jika belum tercatat
                try {
                    const st = updater.getUpdateState();
                    if (!st.currentSha) {
                        const info = await updater.fetchRemoteUpdateInfo();
                        updater.saveUpdateState({
                            currentSha: info.remoteSha,
                            currentVersion: info.remoteVersion,
                            lastNotifiedSha: info.remoteSha
                        });
                    }
                } catch (_) {}
                return Reply(
                    `\`🔔 NOTIF UPDATE SC\`\n` +
                    `> ◦ *Status :* 🟢 AKTIF\n` +
                    `> ◦ *Repo :* github.com/${updater.getRepoConfig().repo}\n` +
                    `> ◦ *Interval Cek :* Setiap 30 menit\n` +
                    `> ◦ *Info :* Jika ada update baru di GitHub, bot akan mengirim log fitur baru & perbaikan ke nomor Owner.`
                );
            }

            if (sub === 'off' || sub === 'nonaktif' || sub === '0') {
                rootDb.settings.notifUpdate = false;
                rootDb.settings._updatedAt = Date.now();
                if (typeof ctx.botCtx.saveSettingsNow === 'function') await ctx.botCtx.saveSettingsNow().catch(() => ctx.botCtx.saveRootDb());
                else ctx.botCtx.saveRootDb();
                return Reply(
                    `\`🔕 NOTIF UPDATE SC\`\n` +
                    `> ◦ *Status :* 🔴 NONAKTIF (Manual)\n` +
                    `> ◦ *Info :* Bot tidak akan mengecek otomatis. Gunakan \`${pfx}cekupdate\` atau \`${pfx}updatesc\` kapan saja secara manual.`
                );
            }

            const isActive = rootDb.settings.notifUpdate === true;
            const st = updater.getUpdateState();
            return Reply(
                `\`🔔 STATUS NOTIF UPDATE SC\`\n` +
                `> ◦ *Notif Otomatis :* ${isActive ? '🟢 ON' : '🔴 OFF (Default Manual)'}\n` +
                `> ◦ *Repo :* github.com/${updater.getRepoConfig().repo}\n` +
                `> ◦ *Versi Lokal :* v${st.currentVersion || '1.0.0'} (\`${st.currentSha ? st.currentSha.slice(0, 7) : 'belum-sync'}\`)\n\n` +
                `📌 *Penggunaan:*\n` +
                `> ◦ \`${pfx}notifupdate on\` — Aktifkan notif update otomatis\n` +
                `> ◦ \`${pfx}notifupdate off\` — Matikan notif otomatis (manual)\n` +
                `> ◦ \`${pfx}cekupdate\` — Lihat changelog update terbaru\n` +
                `> ◦ \`${pfx}updatesc\` — Update otomatis tanpa hapus renamean`
            );
        }

        if (sub === 'protect' || sub === 'unprotect' || sub === 'listprotect') {
            const list = updater.getCustomProtectedList();
            if (sub === 'listprotect') {
                const customLines = list.length ? list.map((p, i) => `> ◦ ${i + 1}. \`${p}\``).join('\n') : '> ◦ _(belum ada tambahan)_';
                return Reply(
                    `\`🛡️ FILE DILINDUNGI SAAT UPDATE\`\n` +
                    `*Bawaan (Otomatis Aman):*\n` +
                    `> ◦ \`settings.js\` (renamean bot, owner, API, DB)\n` +
                    `> ◦ \`data/\`, \`session/\`, \`jadibot-session/\`, \`assets/media/\`\n\n` +
                    `*Tambahan Custom:*\n${customLines}\n\n` +
                    `📌 Tambah: \`${pfx}updatesc protect src/plugins/custom.js\`\n` +
                    `📌 Hapus: \`${pfx}updatesc unprotect src/plugins/custom.js\``
                );
            }
            const targetPath = args.slice(1).join(' ').trim();
            if (!targetPath) return Reply(`📌 Contoh: \`${pfx}updatesc ${sub} src/plugins/custom.js\``);
            if (sub === 'protect') {
                const next = updater.saveCustomProtectedList([...list, targetPath]);
                return Reply(`✅ Path \`${targetPath}\` ditambahkan ke daftar proteksi update (${next.length} path custom).`);
            } else {
                const normTarget = targetPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                const next = updater.saveCustomProtectedList(list.filter((p) => p !== normTarget));
                return Reply(`✅ Path \`${normTarget}\` dihapus dari daftar proteksi custom (${next.length} tersisa).`);
            }
        }

        if (command === 'cekupdate' || sub === 'check' || sub === 'log') {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const info = await updater.fetchRemoteUpdateInfo();
                if (!info.localSha && !info.hasUpdate) {
                    updater.saveUpdateState({
                        currentSha: info.remoteSha,
                        currentVersion: info.remoteVersion,
                        lastNotifiedSha: info.remoteSha
                    });
                    info.localSha = info.remoteSha;
                    info.shortLocal = info.shortRemote;
                }
                const caption = updater.formatUpdateCaption(info, { mode: 'check', usedPrefix: pfx });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(caption);
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal mengecek update GitHub: ${err?.message || err}`);
            }
        }

        // Jalankan .updatesc (atau .updatesc force)
        const force = sub === 'force' || sub === 'paksa' || sub === '-f';
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        await Reply(`⏳ Mengecek & mengunduh update terbaru dari GitHub (*${updater.getRepoConfig().repo}*)...\n_Renamean di settings.js, database, cookies, dan session WA kamu dilindungi otomatis._`);

        try {
            const res = await updater.applyUpdate({ force });
            if (res.upToDate) {
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(updater.formatUpdateCaption(res.info, { mode: 'check', usedPrefix: pfx }));
            }

            try {
                if (typeof ctx.botCtx?.flushStorage === 'function') {
                    await ctx.botCtx.flushStorage(true);
                } else {
                    await database.write(global.db, true);
                }
            } catch (_) {}
            const doneCaption = updater.formatUpdateCaption(res.info, { mode: 'done', result: res, usedPrefix: pfx });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            await Reply(doneCaption);

            setTimeout(() => process.exit(1), 3000);
        } catch (err) {
            console.error('[UpdateSC Error]', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal menjalankan auto-update SC: ${err?.message || err}`);
        }
        return true;
    }
};
