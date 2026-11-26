module.exports = {
    name: 'gdrive',
    category: 'downloader',
    commands: ['gdrive', 'gdrivedl'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!targetUrl || (!targetUrl.includes('drive.google.com') && !targetUrl.includes('docs.google.com'))) {
            return Reply(`\`⌜ Google Drive ⌟\`\n> ◦ *Format :* ${command} url`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/download/gdrive?apikey=${apiKey}&url=${encodeURIComponent(targetUrl.trim())}`, { timeout: 35000 });
            const data = res.data?.result;
            if (!data || !data.downloadUrl) throw new Error("Gagal mengambil link unduhan Google Drive.");

            const captionTxt = `\`⌜ Google Drive Downloader ⌟\`
> ◦ *Nama File :* ${data.fileName || 'GDrive File'}
> ◦ *Ukuran :* ${data.fileSize || '-'}`;

            await Dinz.sendMessage(m.chat, {
                document: { url: data.downloadUrl },
                fileName: data.fileName || 'gdrive_file',
                mimetype: 'application/octet-stream',
                caption: captionTxt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengunduh Google Drive: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
