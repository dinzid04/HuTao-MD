module.exports = {
    name: 'menu-prem',
    category: 'menu',
    commands: [
        'menu-prem', 'menuprem', 'premmenu', 'premiummenu', 'menu-premium', 'menupremium', 'prem', 'premium'
    ],

    async execute(ctx) {
        const { Dinz, m, text, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuprem);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menuprem));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
