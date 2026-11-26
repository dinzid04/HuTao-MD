module.exports = {
    name: 'cekkhodam',
    category: 'fun',
    commands: ['cekkhodam', 'khodam'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetName = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';

        await Dinz.sendMessage(m.chat, { react: { text: "🔮", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/cek-khodam?apikey=${apiKey}&nama=${encodeURIComponent(targetName.trim())}`);
            const data = res.data?.result;
            if (!data || !data.khodam) throw new Error("Gagal mengecek khodam.");

            const resultTxt = `\`⌜ Cek Khodam ⌟\`
> ◦ *Nama :* ${data.nama}
> ◦ *Khodam :* *${data.khodam}*
> ◦ *Karakter :* ${data.sifat || 'Misterius dan kuat'}
> ◦ *Arti :* ${data.arti || 'Selalu mendampingi kemanapun pergi'}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal cek khodam: ${e.message}`);
        }
        return true;
    }
};
