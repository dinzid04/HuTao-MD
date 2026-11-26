module.exports = {
    name: 'shortlink',
    category: 'tools',
    commands: ['shortlink', 'shorturl', 'tinyurl', 'isgd'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let raw = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!raw || raw.trim().length === 0) {
            return Reply(`\`⌜ Shortlink ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        let targetUrl = raw.trim();
        let provider = command === 'isgd' ? 'isgd' : command === 'tinyurl' ? 'tinyurl' : 'tinyurl';

        if (targetUrl.includes('|')) {
            const parts = targetUrl.split('|');
            targetUrl = parts[0].trim();
            provider = parts[1].trim().toLowerCase() || provider;
        }

        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/shortlink?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}&provider=${provider}`, {
                timeout: 20000
            });

            const data = res.data?.result;
            if (!data || !data.shortUrl) {
                throw new Error(res.data?.error || "Gagal memendekkan URL.");
            }

            const resultTxt = `\`⌜ Shortlink Generator ⌟\`
> ◦ *Original :* ${data.originalUrl}
> ◦ *Short URL :* ${data.shortUrl}
> ◦ *Provider :* ${data.provider.toUpperCase()}`;

            await Reply(resultTxt);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Shortlink error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat shortlink: ${err.response?.data?.error || err.message}`);
        }
        return true;
    }
};
