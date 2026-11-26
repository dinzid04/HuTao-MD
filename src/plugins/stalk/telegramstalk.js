module.exports = {
    name: 'telegramstalk',
    category: 'stalk',
    commands: ['telegramstalk', 'stalktelegram', 'stalktg'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Telegram Stalk ⌟\`\n> ◦ *Format :* ${command} <username>\n> ◦ *Contoh :* ${command} durov`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/telegram?apikey=${apiKey}&username=${encodeURIComponent(text.trim().replace(/^@/, ''))}`);
            const data = res.data?.result;
            if (!data || !data.username) throw new Error("Akun Telegram tidak ditemukan.");

            const captionTxt = `\`⌜ Telegram Info ⌟\`
> ◦ *Title :* *${data.title || data.username}*
> ◦ *Username :* @${data.username}
> ◦ *Member :* ${data.members || '-'}
> ◦ *Verified :* ${data.isVerified ? 'Ya ✓' : 'Tidak'}
> ◦ *Bio :* ${data.description || 'Tidak ada bio'}
> ◦ *Link :* ${data.url || `https://t.me/${data.username}`}
        `;

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
