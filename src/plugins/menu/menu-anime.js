const customReact = require('../../services/custom-react');

module.exports = {
    name: 'menu-anime',
    category: 'menu',
    commands: ['menu-anime', 'menuanime'],

    async execute(ctx) {
        const { Dinz, m, command, Reply, menureply, formatWithPrefix } = ctx;
        const hasCustom = customReact.hasCustomReactFor(Dinz, command || 'menu-anime');
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuanime);
        } catch (_) {
            await Reply(formatWithPrefix(global.menuanime));
        }
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return true;
    }
};
