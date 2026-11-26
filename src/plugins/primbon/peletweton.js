module.exports = {
    name: 'peletweton',
    category: 'primbon',
    commands: ['peletweton', 'dayatarik'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const targetName = text ? text.trim() : (m.pushName || 'User');
        await Dinz.sendMessage(m.chat, { react: { text: '💖', key: m.key } }).catch(() => {});
        const result = await primbon.peletWeton(targetName);
        addLimit(m.sender, isCreator);
        if (result.card) {
            return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
        } else {
            return Reply(result.text);
        }
        return true;
    }
};
