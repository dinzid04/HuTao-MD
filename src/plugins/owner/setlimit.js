const limitSvc = require('../../services/limit');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'setlimit',
    category: 'owner',
    commands: ['setlimit', 'limitmode', 'setlimitmode'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, getTargetNumber, setUserCustomLimit, usedPrefix } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const sub = (args[0] || '').toLowerCase();
        const cfg = limitSvc.getLimitConfig();

        if (!sub || sub === 'status' || sub === 'info') {
            return Reply(formatCard({
                icon: '🎫',
                title: 'PENGATURAN SISTEM LIMIT',
                rows: [
                    { label: 'Status Sistem', value: cfg.enabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF / Bebas)' },
                    { label: 'Limit Default/Hari', value: `${cfg.defaultLimit} limit` },
                    { label: 'Biaya per Command', value: `${cfg.commandCost} limit/cmd` },
                    { label: 'Harga Shop Limit', value: `Rp ${cfg.limitPrice.toLocaleString('id-ID')} / limit` }
                ],
                footer:
                    `Penggunaan:\n` +
                    `• ${usedPrefix}setlimit on / off\n` +
                    `• ${usedPrefix}setlimit default <angka>\n` +
                    `• ${usedPrefix}setlimit cost <1-20>\n` +
                    `• ${usedPrefix}setlimit price <rupiah>\n` +
                    `• ${usedPrefix}setlimit @user <jumlah|0>`
            }));
        }

        if (sub === 'on' || sub === 'aktif' || sub === 'enable') {
            limitSvc.setLimitEnabled(true);
            return Reply('✅ *Sistem Limit DIAKTIFKAN (ON)*.\n> ◦ Semua command non-gratis kini memakai limit harian secara otomatis.');
        }

        if (sub === 'off' || sub === 'nonaktif' || sub === 'disable') {
            limitSvc.setLimitEnabled(false);
            return Reply('✅ *Sistem Limit DINONAKTIFKAN (OFF)*.\n> ◦ Semua user bebas memakai fitur tanpa pengurangan limit.');
        }

        if (sub === 'default' || sub === 'harian') {
            const val = parseInt(args[1], 10);
            if (!Number.isFinite(val) || val < 1) return Reply(`❌ Contoh: \`${usedPrefix}setlimit default 30\``);
            const updated = limitSvc.setDefaultDailyLimit(val);
            return Reply(`✅ Limit harian default diatur ke *${updated} limit/hari*.`);
        }

        if (sub === 'cost' || sub === 'biaya' || sub === 'percmd') {
            const val = parseInt(args[1], 10);
            if (!Number.isFinite(val) || val < 1 || val > 20) return Reply(`❌ Biaya per command harus 1–20. Contoh: \`${usedPrefix}setlimit cost 1\``);
            const updated = limitSvc.setCommandLimitCost(val);
            return Reply(`✅ Biaya limit per command diatur ke *${updated} limit/cmd*.`);
        }

        if (sub === 'price' || sub === 'harga') {
            const val = parseInt(String(args[1] || '').replace(/[^0-9]/g, ''), 10);
            if (!Number.isFinite(val) || val < 100) return Reply(`❌ Harga minimal Rp 100. Contoh: \`${usedPrefix}setlimit price 1500\``);
            const updated = limitSvc.setLimitPrice(val);
            return Reply(`✅ Harga beli limit di shop diatur ke *Rp ${updated.toLocaleString('id-ID')} / limit*.`);
        }

        const rawTarget = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null) || args[0] || '';
        const targetNum = getTargetNumber(m, rawTarget);
        const target = targetNum ? targetNum + '@s.whatsapp.net' : null;
        const amount = parseInt(args.find((arg) => !arg.includes('@') && /^\d+$/.test(arg)), 10);

        if (!target || isNaN(amount)) {
            return Reply(`📌 *Contoh:* \`${usedPrefix}setlimit on/off\` atau \`${usedPrefix}setlimit @user 50\``);
        }

        setUserCustomLimit(target, amount);
        if (amount > 0) {
            return Reply(`\`⌜ Limit Kustom Diatur ⌟\`\n> ◦ *Target :* @${targetNum}\n> ◦ *Limit Harian :* ${amount} limit/hari\n> ◦ *Status :* Disimpan Permanen`, [target]);
        }
        return Reply(`\`⌜ Limit Kustom Dihapus ⌟\`\n> ◦ *Target :* @${targetNum}\n> ◦ *Status :* Kembali ke limit default`, [target]);
    }
};
