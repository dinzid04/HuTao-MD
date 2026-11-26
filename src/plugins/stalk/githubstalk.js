module.exports = {
    name: 'githubstalk',
    category: 'stalk',
    commands: ['githubstalk', 'stalkgithub'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ GitHub Stalk ⌟\`\n> ◦ *Format :* ${command} <username>\n> ◦ *Contoh :* ${command} torvalds`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/github?apikey=${apiKey}&username=${encodeURIComponent(text.trim())}`);
            const data = res.data?.result || res.data;
            if (!data || !data.username) throw new Error("Akun GitHub tidak ditemukan.");

            const captionTxt = `\`⌜ GitHub User Info ⌟\`
> ◦ *Username :* *${data.username}*
> ◦ *Nama :* ${data.nickname || '-'}
> ◦ *Bio :* ${data.bio || '-'}
> ◦ *Lokasi :* ${data.location || '-'}
> ◦ *Repo Publik :* ${data.public_repo || '0'}
> ◦ *Followers :* ${data.followers || '0'}
> ◦ *Following :* ${data.following || '0'}
> ◦ *Profil :* ${data.url || `https://github.com/${data.username}`}
        `;

                    if (data.profile_pic) {
                        try {
                            const imgRes = await axios.get(data.profile_pic, { responseType: 'arraybuffer', timeout: 25000 });
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
