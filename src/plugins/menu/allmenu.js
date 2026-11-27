const customReact = require('../../services/custom-react');

module.exports = {
    name: 'allmenu',
    category: 'menu',
    commands: ['allmenu', 'menu-all', 'menuall'],

    async execute(ctx) {
        const { Dinz, m, command, text, Reply, menureply, sendMenuAudio, formatWithPrefix } = ctx;
        const hasCustomReact = customReact.hasCustomReactFor(Dinz, command || 'allmenu');

        if (!hasCustomReact) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        }
        try {
            await menureply(global.allmenu, { isAllMenu: true });
            await sendMenuAudio();
            if (!hasCustomReact) {
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            }
        } catch (e) {
            await Reply(formatWithPrefix(global.allmenu));
            await sendMenuAudio();
            if (!hasCustomReact) {
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            }
        }
        return true;
    }
};
