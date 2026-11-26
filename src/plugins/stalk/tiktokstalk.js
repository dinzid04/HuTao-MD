module.exports = {
    name: 'tiktokstalk',
    category: 'stalk',
    commands: ['tiktokstalk', 'stalktiktok', 'stalktt'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ TikTok Stalk ⌟\`\n> ◦ *Format :* ${command} <username>\n> ◦ *Contoh :* ${command} tiktok`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/tiktok?apikey=${apiKey}&username=${encodeURIComponent(text.trim().replace(/^@/, ''))}`);
            const data = res.data?.result;
            if (!data || !data.username) throw new Error("Akun TikTok tidak ditemukan.");

            const captionTxt = `\`⌜ TikTok Profile Info ⌟\`
> ◦ *Username :* *${data.username}*
> ◦ *Nickname :* ${data.nickname || '-'}
> ◦ *Followers :* ${data.followers || data.follower || '0'}
> ◦ *Following :* ${data.following || '0'}
> ◦ *Total Likes :* ${data.likes || data.heart || '0'}
> ◦ *Bio :* ${data.bio || 'Tidak ada bio'}`;

            if (data.avatar || data.avatarLarger) {
                try {
                    const imgRes = await axios.get(data.avatarLarger || data.avatar, { responseType: 'arraybuffer', timeout: 25000 });
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
