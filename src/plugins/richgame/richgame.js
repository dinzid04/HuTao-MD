const { formatCard, YOUHU_GAMES } = require('./_helper');

module.exports = {
    name: 'richgame',
    category: 'richgame',
    commands: ['richgame', 'gamenew', 'newgame', 'gamecenter', 'richmenu'],

    async execute(ctx) {
        const { Reply, sendSelectList, prefixMgr, usedPrefix } = ctx;

        const p = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;
        const games = Object.values(YOUHU_GAMES);
        const list = games
            .map((g, i) => `${String(i + 1).padStart(2, '0')}. ${g.emoji} *${g.name}* -> \`${p}${g.key}\`\n    ${g.desc}`)
            .join('\n');

        const body = `${list}\n\n*Rich Utilities:*\n◦ 📊 \`${p}richping\` (Live Server Monitor HTML)\n◦ 📈 \`${p}richstats\` (Bot Stats Rich Table)\n◦ 🗂️ \`${p}richtable\` (Buat Tabel Meta AI)\n◦ 💻 \`${p}richcode\` (Code Highlight Meta AI)\n◦ ✨ \`${p}richcard\` (Rich Card + Pill Suggestions)`;

        const card = formatCard({
            icon: '🎮',
            title: `RICH GAME CENTER (${games.length} GAMES)`,
            body,
            footer: 'Pilih game dari tombol di bawah atau ketik perintahnya langsung!'
        });

        if (typeof sendSelectList === 'function') {
            await sendSelectList({
                title: 'Pilih Rich HTML Game',
                buttonTitle: '🎮 Mainkan Rich Game',
                captionText: card,
                rows: games.map(g => ({
                    title: `${g.emoji} ${g.name}`,
                    description: g.desc,
                    id: `${p}${g.key}`
                }))
            });
            return true;
        }
        return Reply(card);
    }
};
