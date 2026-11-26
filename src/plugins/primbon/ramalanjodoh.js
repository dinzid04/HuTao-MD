module.exports = {
    name: 'ramalanjodoh',
    category: 'primbon',
    commands: ['ramalanjodoh'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, primbon } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || !text.includes('|')) {
            return Reply(
                `\`⌜ Format Ramalan Jodoh ⌟\`\n> ◦ *Format :* ramalanjodoh nama1 | tgl1-bln1-thn1 | nama2 | tgl2-bln2-thn2\n> ◦ *Contoh :* ramalanjodoh Dinz | 12-05-2000 | Siti | 15-08-2002`
            );
        }

        const parts = text.split('|').map(s => s.trim());
        if (parts.length < 4) {
            return Reply(
                `\`⌜ Format Ramalan Jodoh ⌟\`\n> ◦ *Format :* ramalanjodoh nama1 | tgl1-bln1-thn1 | nama2 | tgl2-bln2-thn2\n> ◦ *Contoh :* ramalanjodoh Dinz | 12-05-2000 | Siti | 15-08-2002`
            );
        }

        const nama1 = parts[0];
        const date1 = parts[1].split(/[-/.]/);
        const nama2 = parts[2];
        const date2 = parts[3].split(/[-/.]/);

        if (date1.length < 3 || date2.length < 3) {
            return Reply(
                `\`⌜ Format Ramalan Jodoh ⌟\`\n> ◦ *Format :* ramalanjodoh nama1 | tgl1-bln1-thn1 | nama2 | tgl2-bln2-thn2\n> ◦ *Contoh :* ramalanjodoh Dinz | 12-05-2000 | Siti | 15-08-2002`
            );
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {});

        try {
            const result = await primbon.ramalanJodoh(nama1, Number(date1[0]), Number(date1[1]), Number(date1[2]), nama2, Number(date2[0]), Number(date2[1]), Number(date2[2]));
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            if (result.card) {
                return await Dinz.sendMessage(m.chat, { image: result.card, caption: result.text }, { quoted: m });
            } else {
                return Reply(result.text || result);
            }
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil ramalan jodoh: ${e.message}`);
        }
        return true;
    }
};
