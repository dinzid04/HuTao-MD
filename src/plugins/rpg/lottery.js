const { formatNumber, getUser } = require('./_helper');

module.exports = {
    name: 'lottery',
    category: 'rpg',
    commands: ['lottery', 'lotre'],

    async execute(ctx) {
        const { m, args, Reply, usedPrefix } = ctx;

        const pick = parseInt(args[0], 10);
        const ticket = 1000;
        if (!pick || pick < 1 || pick > 10) {
            return Reply(`🎟️ Beli tiket lotre (Rp 1.000) dan pilih angka 1-10!\nContoh: \`${usedPrefix}lotre 7\``);
        }
        const u = getUser(m.sender);
        if (u.money < ticket) return Reply('❌ Saldo kurang untuk beli tiket (Rp 1.000).');
        u.money -= ticket;
        const lucky = Math.floor(Math.random() * 10) + 1;
        if (pick === lucky) {
            u.money += 8500;
            return Reply(`🎉 *JACKPOT LOTRE!* Angka keluar: *${lucky}*\nKamu memenangkan *+Rp 8.500*! Saldo: Rp ${formatNumber(u.money)}`);
        }
        return Reply(`🎟️ Angka keluar: *${lucky}* (pilihanmu: ${pick}). Belum beruntung, coba lagi!`);
    }
};
