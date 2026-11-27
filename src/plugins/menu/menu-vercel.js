const customReact = require('../../services/custom-react');

module.exports = {
    name: 'menu-vercel',
    category: 'menu',
    commands: ['menu-vercel', 'menuvercel', 'vercelmenu'],

    async execute(ctx) {
        const { Dinz, m, command, Reply, menureply, formatWithPrefix } = ctx;
        const hasCustom = customReact.hasCustomReactFor(Dinz, command || 'menu-vercel');
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuvercel);
        } catch (_) {
            await Reply(formatWithPrefix(global.menuvercel));
        }
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return true;
    }
};
