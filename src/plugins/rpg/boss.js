const { formatCard, formatNumber, getUser, checkCd } = require('./_helper');

module.exports = {
    name: 'boss',
    category: 'rpg',
    commands: ['boss', 'worldboss'],

    async execute(ctx) {
        const { m, Reply, addBonusLimit } = ctx;

        const wait = checkCd(`boss_${m.sender}`, 300000);
        if (wait > 0) return Reply(`⏳ Tunggu *${wait} detik* sebelum menantang World Boss lagi.`);
        const u = getUser(m.sender);
        const bosses = ['Leviathan', 'Inferno Titan', 'Abyssal Dragon', 'Cyber Golem'];
        const bossName = bosses[Math.floor(Math.random() * bosses.length)];
        const dmg = 150 + (u.level || 1) * 35 + Math.floor(Math.random() * 200);
        const reward = Math.floor(dmg * 12);
        const exp = Math.floor(dmg * 1.8);
        u.money += reward;
        u.exp += exp;
        try { addBonusLimit(m.sender, 1); } catch (_) {}
        return Reply(formatCard({
            icon: '👹',
            title: `WORLD BOSS: ${bossName}`,
            rows: [
                { label: 'Damage', value: `${formatNumber(dmg)} DMG` },
                { label: 'Reward', value: `+Rp ${formatNumber(reward)} | +${formatNumber(exp)} EXP | +1 Limit` }
            ]
        }));
    }
};
