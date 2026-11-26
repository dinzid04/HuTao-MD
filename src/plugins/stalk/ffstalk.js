module.exports = {
    name: 'ffstalk',
    category: 'stalk',
    commands: ['ffstalk', 'stalkff'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Free Fire Stalk ⌟\`\n> ◦ *Format :* ${command} <id_ff>\n> ◦ *Contoh :* ${command} 12345678`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/ff?apikey=${apiKey}&id=${encodeURIComponent(text.trim())}`);
            const data = res.data?.result;
            if (!data) throw new Error("Akun Free Fire tidak ditemukan.");

            const acc = data.accountInfo || {};
            const guild = data.guildInfo || {};
            const pet = data.petInfo || {};

            const resultTxt = `\`⌜ Free Fire Player Info ⌟\`
> ◦ *Nama :* *${acc['Account Name'] || '-'}*
> ◦ *UID :* ${acc['Account UID'] || text.trim()}
> ◦ *Level :* ${acc['Account Level'] || '-'} (EXP: ${acc['Account EXP'] || '-'})
> ◦ *Region :* ${acc['Account Region'] || '-'}
> ◦ *Likes :* ${acc['Account Likes'] || '-'}
> ◦ *Honor Score :* ${acc['Honor Score'] || '-'}
> ◦ *Bio :* ${acc['Signature'] || '-'}
> ◦ *Guild :* ${guild['Guild Name'] || '-'} (Lvl ${guild['Guild Level'] || '-'})
> ◦ *Pet Aktif :* ${pet['Selected Pet'] || '-'}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
