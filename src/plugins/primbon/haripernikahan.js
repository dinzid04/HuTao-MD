module.exports = {
    name: 'haripernikahan',
    category: 'primbon',
    commands: ['haripernikahan', 'akadnikah'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const parts = (text || '').split(/[|&,]/).map(s => s.trim());
        const nama1 = parts[0] || 'Pria';
        const nama2 = parts[1] || 'Wanita';
        await Dinz.sendMessage(m.chat, { react: { text: '💍', key: m.key } }).catch(() => {});
        const result = await primbon.hariPernikahan(nama1, nama2);
        addLimit(m.sender, isCreator);
        if (result.card) {
            return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
        } else {
            return Reply(result.text);
        }
        return true;
    }
};
