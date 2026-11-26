module.exports = {
    name: 'menu-lid',
    category: 'menu',
    commands: ['menu-lid', 'menulid', 'menuinspector', 'lidmenu'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuinspector);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menuinspector));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
