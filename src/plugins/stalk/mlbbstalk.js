module.exports = {
    name: 'mlbbstalk',
    category: 'stalk',
    commands: ['mlbbstalk', 'stalkml', 'mlstalk'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Mobile Legends Stalk ⌟\`\n> ◦ *Format :* ${command} <id> | <zone>\n> ◦ *Contoh :* ${command} 84437096 | 2163`);
        }

        let [idML, zoneML] = text.split(/[\s|]+/).map(s => s.trim());
        if (!idML || !zoneML) return Reply(`📌 Masukkan ID dan Zone! Contoh: ${command} 84437096 | 2163`);

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/mlbb?apikey=${apiKey}&id=${encodeURIComponent(idML)}&zone=${encodeURIComponent(zoneML)}`);
            const data = res.data?.result;
            if (!data || !data.nickname) throw new Error("Akun MLBB tidak ditemukan.");

            const resultTxt = `\`⌜ MLBB Player Info ⌟\`
> ◦ *Nickname :* *${data.nickname}*
> ◦ *User ID :* ${data.id}
> ◦ *Zone ID :* (${data.zone})
> ◦ *Game :* ${data.game || 'Mobile Legends'}
> ◦ *Status :* ${data.status || 'Verified'}`;

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
