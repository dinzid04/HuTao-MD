const limitSvc = require('../../services/limit');
const { initRpgUser } = require('../../services/rpg');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'buylimit',
    category: 'rpg',
    commands: ['buylimit', 'belilimit', 'shoplimit'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply, usedPrefix } = ctx;

        if (!global.db.users[m.sender]) global.db.users[m.sender] = {};
        const user = global.db.users[m.sender];
        initRpgUser(user);

        const cfg = limitSvc.getLimitConfig();
        const pricePerLimit = cfg.limitPrice || 1500;
        const info = limitSvc.getUserLimitInfo(m.sender, isCreator);
        const wallet = Math.max(0, Math.floor(user.money || 0));
        const maxAffordable = Math.floor(wallet / pricePerLimit);

        const rawArg = (args[0] || '').trim().toLowerCase();
        if (!rawArg) {
            const packages = [5, 10, 25, 50].map((qty) => {
                const cost = qty * pricePerLimit;
                const tag = wallet >= cost ? '🟢' : '🔴';
                return `${tag} *${qty} Limit* — Rp ${cost.toLocaleString('id-ID')}  (\`${usedPrefix}buylimit ${qty}\`)`;
            }).join('\n');

            return Reply(formatCard({
                icon: '🛒',
                title: 'TOKO LIMIT HARIAN (LIMIT SHOP)',
                rows: [
                    { label: 'Status Sistem', value: cfg.enabled ? 'Aktif (ON)' : 'Bebas (OFF)' },
                    { label: 'Limit Kamu', value: info.limitInfo },
                    { label: 'Saldo Dompet', value: `Rp ${wallet.toLocaleString('id-ID')}` },
                    { label: 'Harga Satuan', value: `Rp ${pricePerLimit.toLocaleString('id-ID')} / limit` },
                    { label: 'Maks Bisa Dibeli', value: `${maxAffordable} limit` }
                ],
                body: `Paket Cepat:\n${packages}\n\n💡 Ketik \`${usedPrefix}buylimit <jumlah>\` atau \`${usedPrefix}buylimit all\` untuk membeli langsung.\n🎮 Cari Money & EXP gratis lewat game (\`tebakgambar\`, \`caklontong\`, \`kerja\`, \`mining\`).`
            }));
        }

        if (!cfg.enabled) {
            return Reply('ℹ️ Sistem limit saat ini sedang *NONAKTIF (Bebas)*, jadi kamu tidak perlu membeli limit!');
        }

        const qty = rawArg === 'all' || rawArg === 'max' ? maxAffordable : parseInt(rawArg, 10);
        if (!Number.isFinite(qty) || qty < 1) {
            if (rawArg === 'all' || rawArg === 'max') {
                return Reply(`❌ Saldo dompet kamu (*Rp ${wallet.toLocaleString('id-ID')}*) belum cukup untuk membeli 1 limit (harga: *Rp ${pricePerLimit.toLocaleString('id-ID')}*).`);
            }
            return Reply(`❌ Jumlah tidak valid. Contoh: \`${usedPrefix}buylimit 10\` atau \`${usedPrefix}buylimit all\``);
        }

        if (qty > 500) {
            return Reply('❌ Maksimal pembelian per transaksi adalah *500 limit*.');
        }

        const totalCost = qty * pricePerLimit;
        if (wallet < totalCost) {
            const kurang = totalCost - wallet;
            return Reply(
                `❌ *Saldo Dompet Tidak Cukup!*\n` +
                `> ◦ Harga ${qty} Limit : *Rp ${totalCost.toLocaleString('id-ID')}*\n` +
                `> ◦ Saldo Dompet : *Rp ${wallet.toLocaleString('id-ID')}*\n` +
                `> ◦ Kurang : *Rp ${kurang.toLocaleString('id-ID')}*\n` +
                `> ◦ Tips : Main game atau ketik \`${usedPrefix}tarik <jumlah>\` jika uangmu di Bank.`
            );
        }

        user.money = wallet - totalCost;
        limitSvc.addBonusLimit(m.sender, qty);
        const afterInfo = limitSvc.getUserLimitInfo(m.sender, isCreator);

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🎫',
            title: 'PEMBELIAN LIMIT BERHASIL',
            rows: [
                { label: 'Dibeli', value: `+${qty} Limit` },
                { label: 'Total Bayar', value: `Rp ${totalCost.toLocaleString('id-ID')}` },
                { label: 'Sisa Dompet', value: `Rp ${user.money.toLocaleString('id-ID')}` },
                { label: 'Kuota Sekarang', value: afterInfo.limitInfo }
            ],
            footer: 'Terima kasih telah berbelanja di Limit Shop!'
        }));
    }
};
