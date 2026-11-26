module.exports = {
    name: 'fluxai',
    category: 'ai',
    commands: ['fluxai', 'flux', 'txt2img', 'aiimage', 'generateimage'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let rawPrompt = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!rawPrompt || rawPrompt.trim().length === 0) {
            return Reply(
                `\`⌜ Ai Flux ⌟\`\n> ◦ *Format :* ${command} prompt`
            );
        }

        let targetPrompt = rawPrompt.trim();
        let ratio = "1:1";

        if (targetPrompt.includes('|')) {
            const parts = targetPrompt.split('|');
            targetPrompt = parts[0].trim();
            const reqRatio = parts[1].trim();
            if (['1:1', '16:9', '9:16', '4:3', '3:4'].includes(reqRatio)) {
                ratio = reqRatio;
            }
        }

        if (!targetPrompt || targetPrompt.length === 0) {
            return Reply(`\`⌜ Ai Flux ⌟\`\n> ◦ *Format :* ${command} prompt`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/ai/flux?apikey=${apiKey}&prompt=${encodeURIComponent(targetPrompt)}&aspect_ratio=${ratio}`, {
                timeout: 45000
            });

            const data = res.data?.result;
            if (!data || (!data.image && !data.url)) {
                throw new Error(res.data?.error || "Gagal menghasilkan gambar AI FLUX.");
            }

            const imgUrl = data.image || data.url;
            const captionTxt = `\`⌜ Ai Flux ⌟\`\n> ◦ *Prompt :* ${targetPrompt}`;

            try {
                const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 45000 });
                await Dinz.sendMessage(m.chat, {
                    image: Buffer.from(imgRes.data),
                    caption: captionTxt
                }, { quoted: m });
            } catch (eDl) {
                await Dinz.sendMessage(m.chat, {
                    image: { url: imgUrl },
                    caption: captionTxt
                }, { quoted: m });
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Flux AI error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal menghasilkan gambar: ${err.response?.data?.error || err.message}`);
        }
        return true;
    }
};
