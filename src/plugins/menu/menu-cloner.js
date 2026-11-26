module.exports = {
    name: 'menu-cloner',
    category: 'menu',
    commands: ['menu-cloner', 'menucloner', 'clonermenu', 'menu-clone', 'menuclone', 'setupcloner', 'menusetupclone'],

    async execute(ctx) {
        const { Dinz, m, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menucloner);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menucloner));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
