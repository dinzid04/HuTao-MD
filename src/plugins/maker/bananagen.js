module.exports = {
    name: 'bananagen',
    category: 'maker',
    commands: ['bananagen'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(`\`⌜ Banana AI ⌟\`\n> ◦ *Format :* ${command} prompt`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "🎨", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/imagecreator/bananagen?apikey=${apiKey}&prompt=${encodeURIComponent(text.trim())}`, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            await Dinz.sendMessage(m.chat, {
                image: Buffer.from(res.data),
                caption: `\`⌜ Banana AI Generator ⌟\`\n> ◦ *Prompt :* ${text.trim()}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('[BANANAGEN ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal menghasilkan gambar: ${e.message}`);
        }
        return true;
    }
};
