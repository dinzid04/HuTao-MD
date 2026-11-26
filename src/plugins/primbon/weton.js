module.exports = {
    name: 'weton',
    category: 'primbon',
    commands: ['weton', 'wetonjawa'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) return Reply(example("12-05-2002"));

        const parts = text.trim().split(/[-/.\s]+/);
        if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
            return Reply(
                `\`⌜ Format Cek Weton ⌟\`\n> ◦ *Format :* weton <tgl>-<bln>-<thn>\n> ◦ *Contoh :* weton 12-05-2002`
            );
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.wetonJawa(Number(parts[0]), Number(parts[1]), Number(parts[2]));
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal menghitung weton: ${e.message}`);
        }
        return true;
    }
};
