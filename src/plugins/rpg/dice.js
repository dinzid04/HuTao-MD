const { formatCard, formatNumber, getUser } = require('./_helper');

module.exports = {
    name: 'dice',
    category: 'rpg',
    commands: ['dice', 'dadu'],

    async execute(ctx) {
        const { m, args, Reply } = ctx;

        const bet = parseInt((args[0] || '').replace(/[^0-9]/g, ''), 10) || 0;
        const roll = Math.floor(Math.random() * 6) + 1;
        if (bet <= 0) return Reply(`🎲 Dadu bergulir dan berhenti di angka *${roll}*!`);
        const u = getUser(m.sender);
        if (u.money < bet) return Reply(`❌ Saldo tidak cukup! Saldomu: Rp ${formatNumber(u.money)}`);
        const botRoll = Math.floor(Math.random() * 6) + 1;
        let status = '🤝 Seri';
        if (roll > botRoll) { u.money += bet; status = `✅ MENANG +Rp ${formatNumber(bet)}`; }
        else if (roll < botRoll) { u.money -= bet; status = `❌ KALAH -Rp ${formatNumber(bet)}`; }
        return Reply(formatCard({
            icon: '🎲',
            title: 'ADU DADU',
            rows: [
                { label: 'Dadu Kamu', value: String(roll) },
                { label: 'Dadu Bot', value: String(botRoll) },
                { label: 'Hasil', value: status },
                { label: 'Saldo', value: `Rp ${formatNumber(u.money)}` }
            ]
        }));
    }
};
