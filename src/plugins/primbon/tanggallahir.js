module.exports = {
    name: 'tanggallahir',
    category: 'primbon',
    commands: ['tanggallahir', 'karaktertanggal'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const tgl = text ? parseInt(text.replace(/[^0-9]/g, '')) : 1;
        await Dinz.sendMessage(m.chat, { react: { text: '📅', key: m.key } }).catch(() => {});
        const result = await primbon.tanggalLahir(tgl);
        addLimit(m.sender, isCreator);
        if (result.card) {
            return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
        } else {
            return Reply(result.text);
        }
        return true;
    }
};
