module.exports = {
    name: 'aivideo',
    category: 'ai',
    commands: ['aivideo', 'videogen'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ AI Video ⌟\`\n> ◦ *Format :* ${command} prompt`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎥', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/ai/video?apikey=${apiKey}&prompt=${encodeURIComponent(text.trim())}`, { timeout: 60000 });
            const data = res.data?.result;
            if (!data || (!data.videoUrl && !data.video && !data.url)) throw new Error("Video tidak berhasil digenerate.");

            const vUrl = data.videoUrl || data.video || data.url;
            await Dinz.sendMessage(m.chat, {
                video: { url: vUrl },
                caption: `\`⌜ AI Video Generated ⌟\`\n> ◦ *Prompt :* ${text.trim()}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ AI Video Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
