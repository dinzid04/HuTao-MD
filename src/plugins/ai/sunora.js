module.exports = {
    name: 'sunora',
    category: 'ai',
    commands: ['sunora', 'aimusic'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Sunora AI ⌟\`\n> ◦ *Format :* ${command} prompt`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎵', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/ai/sunora?apikey=${apiKey}&prompt=${encodeURIComponent(text.trim())}`, { timeout: 60000 });
            const data = res.data?.result;
            if (!data || (!data.audioUrl && !data.audio && !data.url)) throw new Error("Musik AI tidak berhasil digenerate.");

            const aUrl = data.audioUrl || data.audio || data.url;
            const captionTxt = `\`⌜ Sunora AI Music ⌟\`\n> ◦ *Prompt :* ${text.trim()}\n> ◦ *Judul :* ${data.title || 'AI Music'}`;

            await Dinz.sendMessage(m.chat, {
                audio: { url: aUrl },
                mimetype: 'audio/mpeg',
                fileName: `${data.title || 'sunora_music'}.mp3`,
                caption: captionTxt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Sunora Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
