module.exports = {
    name: 'asupan',
    category: 'search',
    commands: ['asupan'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, isPrem, Reply, axios, checkLimit, addLimit } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: '✨', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/random/asupan?apikey=${apiKey}`, { timeout: 45000 });
            const data = res.data?.result || res.data;
            const vUrl = data.url || data.video || data.download;
            if (!vUrl) throw new Error("Gagal mengambil video asupan.");

            await Dinz.sendMessage(m.chat, {
                video: { url: vUrl },
                caption: `\`⌜ Video Asupan Random ⌟\`\n> ◦ *Status :* Sukses`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Asupan Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
