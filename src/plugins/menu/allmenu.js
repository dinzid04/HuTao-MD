module.exports = {
    name: 'allmenu',
    category: 'menu',
    commands: ['allmenu', 'menu-all', 'menuall'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, menureply, sendMenuAudio, formatWithPrefix } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            await menureply(global.allmenu, { isAllMenu: true });
            await sendMenuAudio();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Reply(formatWithPrefix(global.allmenu));
            await sendMenuAudio();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        }
        return true;
    }
};
