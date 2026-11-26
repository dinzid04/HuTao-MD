const { formatCard, formatNumber, cleanNum, getUser, getCouplesState } = require('./_helper');

module.exports = {
    name: 'marry',
    category: 'rpg',
    commands: ['marry', 'nikah'],

    async execute(ctx) {
        const { Dinz, m, body, Reply, botCtx, usedPrefix } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const partner = couples[m.sender]?.partner;
        if (!partner) return Reply(`💍 Kamu harus punya pacar dulu lewat \`${usedPrefix}tembak @user\` sebelum menikah!`);
        if (couples[m.sender]?.married) return Reply(`💍 Kamu sudah menikah dengan @${cleanNum(partner)}!`, [partner]);
        const u = getUser(m.sender);
        const cost = 25000;
        if (u.money < cost) return Reply(`❌ Biaya pernikahan Rp ${formatNumber(cost)}. Saldomu: Rp ${formatNumber(u.money)}`);
        u.money -= cost;
        couples[m.sender].married = true;
        couples[m.sender].marriedAt = Date.now();
        if (couples[partner]) {
            couples[partner].married = true;
            couples[partner].marriedAt = Date.now();
        }
        saveCouples();
        return Reply(formatCard({
            icon: '💍',
            title: 'RESMI MENIKAH!',
            body: `🎉 Selamat menempuh hidup baru!\n@${cleanNum(m.sender)} 💍 @${cleanNum(partner)}\nSemoga bahagia selalu!`
        }), [m.sender, partner]);
    }
};
