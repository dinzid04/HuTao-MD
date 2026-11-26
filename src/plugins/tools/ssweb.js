module.exports = {
    name: 'ssweb',
    category: 'tools',
    commands: ['ssweb', 'screenshotweb', 'ss'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || targetUrl.trim().length === 0) {
            return Reply(`\`⌜ Screenshot Web ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        targetUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/ssweb?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}`, {
                timeout: 35000
            });

            const imgUrl = res.data?.result;
            if (!imgUrl) {
                throw new Error(res.data?.error || "Gagal mengambil screenshot website.");
            }

            const captionTxt = `\`⌜ Screenshot Website ⌟\`\n> ◦ *URL :* ${targetUrl}`;
            try {
                const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
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
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('SSWeb error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengambil screenshot website: ${err.response?.data?.error || err.message}`);
        }
        return true;
    }
};
