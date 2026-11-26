const { formatCard, formatNumber } = require('../../utils/formatter');

module.exports = {
    name: 'wrml',
    category: 'tools',
    commands: ['hitungwrmlbb', 'wrml', 'hitungwr'],

    async execute(ctx) {
        const { text, body, Reply, usedPrefix } = ctx;

        const parts = text.replace(/[,|]/g, ' ').trim().split(/\s+/).map(Number);
        if (parts.length < 3 || parts.some((n) => isNaN(n))) {
            return Reply(formatCard({
                icon: '🎮',
                title: 'KALKULATOR WINRATE MLBB',
                body: `Format: \`${usedPrefix}wrml <total_match> <wr_sekarang> <target_wr>\`\nContoh: \`${usedPrefix}wrml 250 52.5 60\``
            }));
        }
        const [totalMatch, curWr, targetWr] = parts;
        if (totalMatch <= 0 || curWr < 0 || curWr > 100 || targetWr <= 0 || targetWr >= 100) {
            return Reply('❌ Nilai tidak valid. Target WR harus antara 1 sampai 99.9%.');
        }
        const currentWins = totalMatch * (curWr / 100);
        let resultText = '';
        if (targetWr > curWr) {
            const needWins = Math.ceil((targetWr * totalMatch - 100 * currentWins) / (100 - targetWr));
            resultText = `Kamu butuh *${formatNumber(needWins)} kemenangan beruntun (win streak)* tanpa kalah untuk mencapai WR *${targetWr}%*.`;
        } else if (targetWr < curWr) {
            const needLoss = Math.ceil((100 * currentWins - targetWr * totalMatch) / targetWr);
            resultText = `WR kamu sudah di atas target! Butuh *${formatNumber(needLoss)} kekalahan beruntun* untuk turun ke *${targetWr}%*.`;
        } else {
            resultText = 'Winrate kamu sudah tepat di target!';
        }
        return Reply(formatCard({
            icon: '🏆',
            title: 'HASIL HITUNG WR MLBB',
            rows: [
                { label: 'Total Match', value: formatNumber(totalMatch) },
                { label: 'WR Saat Ini', value: `${curWr}% (~${Math.round(currentWins)} menang)` },
                { label: 'Target WR', value: `${targetWr}%` }
            ],
            body: resultText
        }));
    }
};
