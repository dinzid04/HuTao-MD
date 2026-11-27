const customReact = require('../../services/custom-react');

module.exports = {
    name: 'menu-roleplay',
    category: 'menu',
    commands: ['menu-roleplay', 'menuroleplay', 'menu-rp'],

    async execute(ctx) {
        const { Dinz, m, command, Reply, menureply, formatWithPrefix } = ctx;
        const hasCustom = customReact.hasCustomReactFor(Dinz, command || 'menu-roleplay');
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuroleplay);
        } catch (_) {
            await Reply(formatWithPrefix(global.menuroleplay));
        }
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return true;
    }
};
