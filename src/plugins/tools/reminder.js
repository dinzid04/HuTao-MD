const moment = require('moment-timezone');

const remindersByUser = new Map();
let seqId = 1;

function parseDurationMs(raw) {
    const m = String(raw || '').trim().toLowerCase().match(/^(\d+)(s|d|dtk|detik|m|mnt|menit|h|j|jam)$/);
    if (!m) return 0;
    const val = parseInt(m[1], 10);
    const unit = m[2];
    if (unit === 's' || unit === 'd' || unit === 'dtk' || unit === 'detik') return val * 1000;
    if (unit === 'm' || unit === 'mnt' || unit === 'menit') return val * 60 * 1000;
    if (unit === 'h' || unit === 'j' || unit === 'jam') return val * 3600 * 1000;
    return 0;
}

module.exports = {
    name: 'reminder',
    category: 'tools',
    commands: ['ingatkan', 'remind', 'reminder', 'listingat', 'delingat'],

    async execute(ctx) {
        const { Dinz, m, command, args, Reply, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const userList = remindersByUser.get(m.sender) || [];

        if (cmd === 'listingat') {
            if (!userList.length) return Reply(`⏰ Kamu tidak punya pengingat aktif.\n> Buat: \`${pfx}ingatkan 15m Sholat / Belajar\``);
            const lines = userList.map((r, i) => `> *${i + 1}.* [${moment(r.fireAt).tz(tz).format('HH:mm:ss')}] ${r.note}`);
            return Reply(`\`⏰ PENGINGAT AKTIF KAMU (${userList.length})\`\n${lines.join('\n')}\n\n💡 Hapus: \`${pfx}delingat <nomor|all>\``);
        }

        if (cmd === 'delingat') {
            const pick = (args[0] || '').toLowerCase();
            if (!pick) return Reply(`⏰ Format: \`${pfx}delingat <nomor|all>\``);
            if (pick === 'all') {
                userList.forEach((r) => clearTimeout(r.timer));
                remindersByUser.delete(m.sender);
                return Reply('🗑️ Semua pengingat aktif kamu dihapus.');
            }
            const idx = parseInt(pick, 10) - 1;
            if (!Number.isInteger(idx) || idx < 0 || idx >= userList.length) {
                return Reply(`❌ Nomor pengingat tidak valid. Cek \`${pfx}listingat\`.`);
            }
            const [removed] = userList.splice(idx, 1);
            clearTimeout(removed.timer);
            remindersByUser.set(m.sender, userList);
            return Reply(`🗑️ Pengingat *"${removed.note}"* dibatalkan.`);
        }

        // .ingatkan <durasi> <pesan>
        const ms = parseDurationMs(args[0]);
        const note = args.slice(1).join(' ').trim();
        if (!ms || ms < 5000 || ms > 24 * 3600 * 1000 || !note) {
            return Reply(
                `\`⏰ PENGINGAT OTOMATIS\`\n` +
                `> ◦ *Format :* \`${pfx}ingatkan <waktu> <pesan>\`\n` +
                `> ◦ *Contoh :* \`${pfx}ingatkan 10m Minum air\` atau \`${pfx}ingatkan 2j Meeting\`\n` +
                `> ◦ *Satuan :* \`s/detik\`, \`m/menit\`, \`h/jam\` (maks 24 jam)`
            );
        }
        if (userList.length >= 10) return Reply('⚠️ Maksimal 10 pengingat aktif per user.');

        const id = seqId++;
        const fireAt = Date.now() + ms;
        const senderTag = `@${String(m.sender).split('@')[0].split(':')[0]}`;
        const timer = setTimeout(async () => {
            const cur = remindersByUser.get(m.sender) || [];
            const next = cur.filter((x) => x.id !== id);
            if (next.length) remindersByUser.set(m.sender, next);
            else remindersByUser.delete(m.sender);

            await Dinz.sendMessage(m.chat, {
                text: `\`⏰ PENGINGAT WAKTU TIBA!\`\n> ◦ *Untuk :* ${senderTag}\n> ◦ *Pesan :* *${note}*`,
                mentions: [m.sender]
            }, { quoted: m }).catch(() => {});
        }, ms);
        if (typeof timer.unref === 'function') timer.unref();

        userList.push({ id, note, fireAt, timer });
        remindersByUser.set(m.sender, userList);
        return Reply(
            `✅ *Pengingat diatur!*\n` +
            `> ◦ *Pesan :* ${note}\n` +
            `> ◦ *Berbunyi pukul :* *${moment(fireAt).tz(tz).format('HH:mm:ss [WIB]')}*`
        );
    }
};
