module.exports = {
    name: 'menu-jagagrup',
    category: 'menu',
    commands: ['menu-jagagrup', 'menujagagrup', 'jagagrupmenu', 'menu-anti', 'menuanti'],

    async execute(ctx) {
        const { Dinz, m, Reply, menureply, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menujagagrup);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.menujagagrup));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
