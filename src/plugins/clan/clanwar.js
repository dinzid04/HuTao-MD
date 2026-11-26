const { formatCard, formatNumber, getUser, calcClanPower } = require('./_helper');

module.exports = {
    name: 'clanwar',
    category: 'clan',
    commands: ['clanwar', 'war', 'guildwar'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix, addBonusLimit } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const user = getUser(m.sender);

        if (!user.clanId || !clans[user.clanId]) return Reply('❌ Kamu belum bergabung di clan.');
        const myClan = clans[user.clanId];
        const query = text.trim();
        if (!query) {
            return Reply(formatCard({
                icon: '⚔️',
                title: 'CLAN WAR',
                body: `Tantang clan lain untuk berperang!\nContoh: \`${usedPrefix}clanwar <ID_CLAN>\`\nLihat daftar ID: \`${usedPrefix}clanleaderboard\`\nSyarat: Minimal 2 member per clan, cooldown 30 menit.`
            }));
        }

        const lastWar = global.clanWarCooldowns[myClan.id] || 0;
        const left = 30 * 60000 - (Date.now() - lastWar);
        if (left > 0) {
            return Reply(`⏳ Clan kamu sedang istirahat! Tunggu *${Math.ceil(left / 60000)} menit* lagi untuk Clan War.`);
        }

        const enemy = clans[query.toUpperCase()]
            || Object.values(clans).find((c) => c.name.toLowerCase() === query.toLowerCase());
        if (!enemy) return Reply('❌ Clan lawan tidak ditemukan.');
        if (enemy.id === myClan.id) return Reply('❌ Tidak bisa war melawan clan sendiri.');
        if (myClan.members.length < 2) return Reply('❌ Clan kamu butuh minimal 2 member untuk war.');
        if (enemy.members.length < 2) return Reply('❌ Clan lawan butuh minimal 2 member untuk war.');

        global.clanWarCooldowns[myClan.id] = Date.now();
        const p1 = calcClanPower(myClan);
        const p2 = calcClanPower(enemy);
        const total = Math.max(1, p1 + p2);
        const win = Math.random() < p1 / total;
        const ratio = Math.max(1, Math.min(9, Math.round((p1 / total) * 10)));
        const bar = '🟩'.repeat(ratio) + '🟥'.repeat(10 - ratio);

        const mult = 1 + (myClan.level || 1) * 0.1;
        const winMoney = Math.floor(15000 * mult);
        const loseMoney = Math.floor(3500 * mult);
        const winExp = Math.floor(5000 * mult);
        const loseExp = Math.floor(1200 * mult);

        const applyRewards = (c, isWinner) => {
            if (isWinner) { c.wins += 1; c.exp += 3000; }
            else { c.losses += 1; c.exp += 800; }
            c.level = Math.floor(c.exp / 10000) + 1;
            for (const jid of c.members) {
                const u = getUser(jid);
                u.money += isWinner ? winMoney : loseMoney;
                u.exp += isWinner ? winExp : loseExp;
                if (isWinner) try { addBonusLimit(jid, 3); } catch (_) {}
            }
        };

        applyRewards(myClan, win);
        applyRewards(enemy, !win);
        saveClans();

        const winnerClan = win ? myClan : enemy;
        return Reply(formatCard({
            icon: '⚔️',
            title: 'HASIL CLAN WAR',
            rows: [
                { label: 'Pertarungan', value: `${myClan.emblem} ${myClan.name} vs ${enemy.name} ${enemy.emblem}` },
                { label: 'Power', value: `${formatNumber(p1)} vs ${formatNumber(p2)}` },
                { label: 'Dominasi', value: bar },
                { label: 'Pemenang', value: `${winnerClan.emblem} *${winnerClan.name}*` }
            ],
            body: win
                ? `🎉 *VICTORY!* Tiap member mendapat +Rp ${formatNumber(winMoney)}, +${formatNumber(winExp)} EXP, +3 Limit (+3.000 Clan EXP)`
                : `😔 *DEFEAT!* Konsolasi tiap member: +Rp ${formatNumber(loseMoney)}, +${formatNumber(loseExp)} EXP (+800 Clan EXP)`
        }));
    }
};
