module.exports = {
    name: 'gitclone',
    category: 'downloader',
    commands: ['gitclone'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.includes('github.com')) {
            return Reply(`\`⌜ GitClone ⌟\`\n> ◦ *Format :* ${command} url_repo`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/github?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 45000 });
            const data = res.data?.result;
            if (!data || !data.download) throw new Error("Gagal mengambil link repository GitHub.");

            const captionTxt = `\`⌜ GitHub Repo Cloned ⌟\`
> ◦ *Repo :* ${data.repo || 'Repository'}
> ◦ *Author :* ${data.user || '-'}`;

            await Dinz.sendMessage(m.chat, {
                document: { url: data.download },
                fileName: `${data.repo || 'repository'}.zip`,
                mimetype: 'application/zip',
                caption: captionTxt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal clone repository: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
