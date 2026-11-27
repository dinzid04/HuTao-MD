const customReact = require('../../services/custom-react');

module.exports = {
    name: 'menu-channel',
    category: 'menu',
    commands: ['menu-channel', 'menuchannel', 'menu-saluran'],

    async execute(ctx) {
        const { Dinz, m, command, Reply, menureply, formatWithPrefix } = ctx;
        const hasCustom = customReact.hasCustomReactFor(Dinz, command || 'menu-channel');
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.menuchannel);
        } catch (_) {
            await Reply(formatWithPrefix(global.menuchannel));
        }
        if (!hasCustom) await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return true;
    }
};
