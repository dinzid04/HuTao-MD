module.exports = {
    name: 'menu-setup',
    category: 'menu',
    commands: ['menu-setup', 'menusetup', 'setupmenu', 'menu-rename', 'menurename', 'renamemenu'],

    async execute(ctx) {
        const { Dinz, m, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menusetup);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menusetup));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
