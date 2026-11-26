module.exports = {
    name: 'mediafire',
    category: 'downloader',
    commands: ['mediafire', 'mf'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || !targetUrl.includes('mediafire.com')) {
            return Reply(`\`⌜ Mediafire ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/mediafire?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.url) throw new Error("Gagal mengambil link unduhan Mediafire.");

            const captionTxt = `\`⌜ MediaFire Downloader ⌟\`
> ◦ *Nama File :* ${data.filename || 'File'}
> ◦ *Ukuran :* ${data.filesize || '-'}
> ◦ *Tipe :* ${data.filetype || '-'}`;

            await Dinz.sendMessage(m.chat, {
                document: { url: data.url },
                fileName: data.filename || 'mediafire_file',
                mimetype: 'application/octet-stream',
                caption: captionTxt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Mediafire: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
