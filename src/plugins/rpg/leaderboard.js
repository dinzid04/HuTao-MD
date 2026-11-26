const lbSvc = require('../../services/leaderboard-renderer');

module.exports = {
    name: 'leaderboard',
    category: 'rpg',
    commands: ['leaderboard', 'lb', 'toprpg', 'top'],

    async execute(ctx) {
        const { Dinz, m, args, store, Reply, botCtx, usedPrefix } = ctx;

        const a0 = (args[0] || '').toLowerCase().trim();
        const a1 = (args[1] || '').toLowerCase().trim();

        let categoryRaw = 'level';
        let scope = m.isGroup ? 'group' : 'global';

        if (a0 === 'global' || a0 === 'all') {
            scope = 'global';
            categoryRaw = a1 || 'level';
        } else if (a0) {
            categoryRaw = a0;
            if (a1 === 'global' || a1 === 'all') scope = 'global';
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🏆', key: m.key } }).catch(() => {});

        const data = await lbSvc.buildLeaderboardData({
            Dinz,
            m,
            store,
            categoryRaw,
            scope
        });

        const built = lbSvc.buildLeaderboardCaption(data, usedPrefix);
        if (typeof built === 'string') {
            return Reply(built);
        }

        const identity = botCtx.getBotIdentity(Dinz);
        const imgBuf = await lbSvc.renderLeaderboardImage(data, identity.botname || global.botname || 'HuTao - MD');

        if (imgBuf && Buffer.isBuffer(imgBuf)) {
            await Dinz.sendMessage(m.chat, {
                image: imgBuf,
                caption: built.caption,
                contextInfo: built.mentions.length ? { mentionedJid: built.mentions } : undefined
            }, { quoted: m });
            return true;
        }

        await Reply(built.caption, built.mentions);
        return true;
    }
};
