const { formatCard, formatNumber, getUser } = require('./_helper');

module.exports = {
    name: 'coinflip',
    category: 'rpg',
    commands: ['coinflip', 'cf'],

    async execute(ctx) {
        const { m, args, Reply, usedPrefix } = ctx;

        const side = (args[0] || '').toLowerCase();
        const bet = parseInt((args[1] || '').replace(/[^0-9]/g, ''), 10);
        if (!['head', 'tail', 'gambar', 'angka'].includes(side) || !bet || bet < 50) {
            return Reply(`🪙 Format: \`${usedPrefix}coinflip head/tail <taruhan>\`\nContoh: \`${usedPrefix}coinflip head 1000\``);
        }
        const u = getUser(m.sender);
        if (u.money < bet) return Reply(`❌ Saldo kurang! Saldomu: Rp ${formatNumber(u.money)}`);
        const normPick = (side === 'head' || side === 'gambar') ? 'head' : 'tail';
        const result = Math.random() < 0.5 ? 'head' : 'tail';
        const won = normPick === result;
        u.money += won ? bet : -bet;
        return Reply(formatCard({
            icon: '🪙',
            title: 'COINFLIP',
            rows: [
                { label: 'Pilihan', value: normPick.toUpperCase() },
                { label: 'Hasil Koin', value: result.toUpperCase() },
                { label: 'Status', value: won ? `✅ MENANG +Rp ${formatNumber(bet)}` : `❌ KALAH -Rp ${formatNumber(bet)}` },
                { label: 'Saldo', value: `Rp ${formatNumber(u.money)}` }
            ]
        }));
    }
};
