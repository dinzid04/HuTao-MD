module.exports = {
    name: 'menu-jadibot',
    category: 'menu',
    commands: ['menu-jadibot', 'menujadibot'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menujadibot);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menujadibot));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
