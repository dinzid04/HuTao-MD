const scheduler = require('../../core/scheduler');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'autobackup',
    category: 'owner',
    commands: ['autobackup', 'setbackup', 'setautobackup'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, isMainOwner, Reply, moment, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const sub = (args[0] || 'status').toLowerCase();

        const renderStatus = (headerTitle = 'AUTO-BACKUP DATABASE') => {
            const cfg = scheduler.getAutoBackupConfig();
            const backups = scheduler.listLocalBackups();
            const lastStr = cfg.lastBackupAt ? moment(cfg.lastBackupAt).tz(tz).format('DD/MM/YYYY HH:mm [WIB]') : 'Belum pernah';
            const nextStr = cfg.enabled && cfg.nextBackupAt
                ? moment(cfg.nextBackupAt).tz(tz).format('DD/MM/YYYY HH:mm [WIB]')
                : 'Nonaktif';

            return formatCard({
                icon: '💾',
                title: headerTitle,
                rows: [
                    { label: 'Status', value: cfg.enabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)' },
                    { label: 'Interval', value: cfg.intervalLabel },
                    { label: 'Kirim ke WA Owner', value: cfg.sendToOwner ? 'ON' : 'OFF (Lokal saja)' },
                    { label: 'Simpan Lokal', value: `${backups.length} / ${cfg.keepLocal} file (data/backups/)` },
                    { label: 'Backup Terakhir', value: lastStr },
                    { label: 'Jadwal Berikutnya', value: nextStr }
                ],
                footer:
                    `Penggunaan:\n` +
                    `• ${usedPrefix}autobackup on / off\n` +
                    `• ${usedPrefix}autobackup set 6j (30m / 1j / 6j / 12j / 1d)\n` +
                    `• ${usedPrefix}autobackup wa on / off\n` +
                    `• ${usedPrefix}autobackup keep 5\n` +
                    `• ${usedPrefix}autobackup now | list`
            });
        };

        if (sub === 'status' || sub === 'info' || sub === 'cek') {
            return Reply(renderStatus());
        }

        if (sub === 'on' || sub === 'aktif' || sub === 'enable') {
            scheduler.saveAutoBackupConfig({ enabled: true });
            scheduler.syncAutoBackupTimer();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(renderStatus('AUTO-BACKUP DIAKTIFKAN'));
        }

        if (sub === 'off' || sub === 'nonaktif' || sub === 'disable') {
            scheduler.saveAutoBackupConfig({ enabled: false, nextBackupAt: 0 });
            scheduler.syncAutoBackupTimer();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(renderStatus('AUTO-BACKUP DINONAKTIFKAN'));
        }

        if (sub === 'set' || sub === 'waktu' || sub === 'interval' || /^\d+(m|min|menit|j|jam|h|hr|hour|d|day|hari)?$/.test(sub)) {
            const rawVal = (sub === 'set' || sub === 'waktu' || sub === 'interval') ? args.slice(1).join('') : sub;
            const parsed = scheduler.parseBackupInterval(rawVal);
            if (!parsed) {
                return Reply(`❌ Format waktu tidak valid.\n> ◦ Contoh: \`${usedPrefix}autobackup set 30m\`, \`${usedPrefix}autobackup set 6j\`, \`${usedPrefix}autobackup set 1d\``);
            }
            if (parsed.error) return Reply(`❌ ${parsed.error}`);

            const cur = scheduler.getAutoBackupConfig();
            const enableFlag = args.some((a) => String(a).toLowerCase() === 'on') ? true : cur.enabled;
            scheduler.saveAutoBackupConfig({
                intervalMs: parsed.ms,
                intervalLabel: parsed.label,
                enabled: enableFlag
            });
            scheduler.syncAutoBackupTimer();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(renderStatus(`INTERVAL DIUBAH KE ${parsed.label.toUpperCase()}`));
        }

        if (sub === 'wa' || sub === 'kirim' || sub === 'owner') {
            const mode = (args[1] || '').toLowerCase();
            if (!['on', 'off'].includes(mode)) {
                return Reply(`❌ Gunakan: \`${usedPrefix}autobackup wa on\` atau \`${usedPrefix}autobackup wa off\``);
            }
            scheduler.saveAutoBackupConfig({ sendToOwner: mode === 'on' });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(renderStatus(`KIRIM WA OWNER: ${mode.toUpperCase()}`));
        }

        if (sub === 'keep' || sub === 'max') {
            const count = parseInt(args[1], 10);
            if (!Number.isFinite(count) || count < 1 || count > 20) {
                return Reply(`❌ Jumlah simpan lokal harus antara *1 sampai 20*.\n> ◦ Contoh: \`${usedPrefix}autobackup keep 5\``);
            }
            scheduler.saveAutoBackupConfig({ keepLocal: count });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(renderStatus(`SIMPAN LOKAL MAX ${count} FILE`));
        }

        if (sub === 'list') {
            const backups = scheduler.listLocalBackups();
            if (backups.length === 0) {
                return Reply(`📂 Belum ada file backup lokal di \`data/backups/\`.\n> ◦ Ketik \`${usedPrefix}autobackup now\` untuk membuat backup sekarang.`);
            }
            const lines = backups.map((b, i) => {
                const kb = (b.size / 1024).toFixed(1);
                const t = moment(b.mtimeMs).tz(tz).format('DD/MM/YYYY HH:mm');
                return `${i + 1}. *${b.name}* (${kb} KB • ${t})`;
            });
            return Reply(formatCard({
                icon: '📂',
                title: `DAFTAR BACKUP LOKAL (${backups.length})`,
                body: lines.join('\n')
            }));
        }

        if (sub === 'now' || sub === 'run' || sub === 'test') {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            const res = await scheduler.executeDatabaseBackup({
                manual: true,
                sock: Dinz,
                targetJid: m.chat,
                quoted: m,
                forceSendWa: true
            });
            if (!res.ok) return Reply(`❌ Backup gagal: ${res.message}`);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (!res.sentWa) {
                return Reply(`✅ Backup lokal berhasil disimpan: *${res.fileName}* (${res.sizeKb} KB), namun gagal mengirim dokumen ke WA.`);
            }
            return true;
        }

        return Reply(renderStatus());
    }
};
