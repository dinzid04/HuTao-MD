module.exports = {
    name: 'lirik',
    category: 'search',
    commands: ['lirik', 'lyrics'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Lirik Lagu ⌟\`\n> ◦ *Format :* ${command} judul_lagu`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎵', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/search/lirik?apikey=${apiKey}&title=${encodeURIComponent(text.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.lyrics) throw new Error("Lirik lagu tidak ditemukan.");

            const resultTxt = `\`⌜ Lirik Lagu ⌟\`
> ◦ *Judul :* *${data.title || text.trim()}*
> ◦ *Artis :* ${data.artist || '-'}

${data.lyrics}`;

            if (data.image) {
                try {
                    const imgRes = await axios.get(data.image, { responseType: 'arraybuffer', timeout: 25000 });
                    await Dinz.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: resultTxt }, { quoted: m });
                } catch (eImg) {
                    await Reply(resultTxt);
                }
            } else {
                await Reply(resultTxt);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Lirik Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
