const { formatCard, formatNumber, getUser, checkCd } = require('./_helper');

module.exports = {
    name: 'quest',
    category: 'rpg',
    commands: ['quest', 'misi'],

    async execute(ctx) {
        const { m, Reply } = ctx;

        const wait = checkCd(`quest_${m.sender}`, 180000);
        if (wait > 0) return Reply(`⏳ Misi baru tersedia dalam *${wait} detik*.`);
        const missions = [
            'Mengantar surat rahasia ke ibukota',
            'Membersihkan sarang slime di hutan timur',
            'Menjaga karavan pedagang melewati gurun',
            'Mencari kristal mana di gua es'
        ];
        const pick = missions[Math.floor(Math.random() * missions.length)];
        const reward = 1500 + Math.floor(Math.random() * 2500);
        const exp = 250 + Math.floor(Math.random() * 350);
        const u = getUser(m.sender);
        u.money += reward;
        u.exp += exp;
        return Reply(formatCard({
            icon: '📜',
            title: 'QUEST SELESAI',
            rows: [
                { label: 'Misi', value: pick },
                { label: 'Hadiah', value: `+Rp ${formatNumber(reward)} | +${exp} EXP` }
            ]
        }));
    }
};
