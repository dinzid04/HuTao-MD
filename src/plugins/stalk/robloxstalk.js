module.exports = {
    name: 'robloxstalk',
    category: 'stalk',
    commands: ['robloxstalk', 'stalkroblox'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Roblox Stalk ⌟\`\n> ◦ *Format :* ${command} <username>\n> ◦ *Contoh :* ${command} Roblox`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/roblox?apikey=${apiKey}&username=${encodeURIComponent(text.trim())}`);
            const data = res.data?.result;
            if (!data || !data.username) throw new Error("Akun Roblox tidak ditemukan.");

            const captionTxt = `\`⌜ Roblox Profile Info ⌟\`
> ◦ *Username :* *${data.username}*
> ◦ *Display Name :* ${data.displayName || '-'}
> ◦ *User ID :* ${data.id || '-'}
> ◦ *Dibuat :* ${data.createdAt || '-'}
> ◦ *Verified :* ${data.hasVerifiedBadge ? 'Ya ✓' : 'Tidak'}
> ◦ *Bio :* ${data.description || 'Tidak ada deskripsi'}`;

            if (data.avatar) {
                try {
                    const imgRes = await axios.get(data.avatar, { responseType: 'arraybuffer', timeout: 25000 });
                    await Dinz.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: captionTxt }, { quoted: m });
                } catch (eImg) {
                    await Reply(captionTxt);
                }
            } else {
                await Reply(captionTxt);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
