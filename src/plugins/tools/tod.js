module.exports = {
    name: 'tod',
    category: 'tools',
    commands: ['tod', 'truth', 'dare'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const reqType = command === 'truth' ? 'truth' : command === 'dare' ? 'dare' : (text && text.trim().toLowerCase() === 'dare' ? 'dare' : 'truth');

        await Dinz.sendMessage(m.chat, { react: { text: "🎲", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/truth-or-dare?apikey=${apiKey}&type=${reqType}`);
            const data = res.data?.result;
            if (!data || !data.challenge) throw new Error("Gagal mengambil tantangan ToD.");

            const resultTxt = `\`⌜ Truth or Dare ⌟\`
> ◦ *Tipe :* *${reqType.toUpperCase()}*
> ◦ *Tantangan :*
>
> ${data.challenge}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
