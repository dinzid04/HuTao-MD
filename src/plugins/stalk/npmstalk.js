module.exports = {
    name: 'npmstalk',
    category: 'stalk',
    commands: ['npmstalk', 'stalknpm'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ NPM Package Stalk ⌟\`\n> ◦ *Format :* ${command} <nama_package>\n> ◦ *Contoh :* ${command} axios`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🔍", key: m.key } }).catch(() => {});
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/stalk/npm?apikey=${apiKey}&name=${encodeURIComponent(text.trim())}`);
            const data = res.data?.result;
            if (!data || !data.name) throw new Error("Package NPM tidak ditemukan.");

            const resultTxt = `\`⌜ NPM Package Info ⌟\`
> ◦ *Package :* *${data.name}*
> ◦ *Versi Terbaru :* ${data.versionLatest || '-'}
> ◦ *Versi Rilis Awal :* ${data.versionPublish || '-'}
> ◦ *Total Versi :* ${data.totalVersions || '1'}
> ◦ *Lisensi :* ${data.license || 'ISC'}
> ◦ *Author :* ${data.author || '-'}
> ◦ *Deskripsi :* ${data.description || '-'}
> ◦ *Dependencies :* ${data.latestDependencies || '0'}
> ◦ *Link NPM :* ${data.link || `https://www.npmjs.com/package/${data.name}`}
        `;

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
