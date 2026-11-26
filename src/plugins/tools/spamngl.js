module.exports = {
    name: 'spamngl',
    category: 'tools',
    commands: ['spamngl', 'ngl'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || !text.includes('|')) {
            return Reply(`\`⌜ Spam NGL Link ⌟\`\n> ◦ *Format :* ${command} <link_ngl> | <pesan> | <jumlah>\n> ◦ *Contoh :* ${command} https://ngl.link/alip | Halo bang | 5`);
        }

        let [nglLink, nglMsg, nglCount] = text.split('|').map(s => s.trim());
        if (!nglLink || !nglMsg) return Reply(`📌 Format salah! Contoh: ${command} https://ngl.link/alip | Halo bang | 5`);
        let count = Math.min(20, Math.max(1, parseInt(nglCount || '3', 10)));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/spamngl?apikey=${apiKey}&link=${encodeURIComponent(nglLink)}&message=${encodeURIComponent(nglMsg)}&count=${count}`, { timeout: 35000 });
            await Reply(`\`⌜ Spam NGL Berhasil ⌟\`\n> ◦ *Target :* ${nglLink}\n> ◦ *Pesan :* ${nglMsg}\n> ◦ *Terkirim :* ${count} pesan`);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal spam NGL: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
