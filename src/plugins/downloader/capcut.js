module.exports = {
    name: 'capcut',
    category: 'downloader',
    commands: ['capcut', 'cc', 'capcutdl'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit,
            downloadCapcut
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!targetUrl || targetUrl.trim().length === 0) {
            return Reply(example("https://www.capcut.com/tv2/ZSqaGCJUv/"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const result = await downloadCapcut(targetUrl);
            const captionText = `\`⌜ CapCut Downloader ⌟\`\n> ◦ *Judul :* ${result.title || '-'}\n> ◦ *Author :* ${result.author || '-'}\n> ◦ *Kualitas :* HD (No Watermark)`;

            if (result.buffer) {
                await Dinz.sendMessage(m.chat, {
                    video: result.buffer,
                    caption: captionText,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else if (result.videoUrl) {
                await Dinz.sendMessage(m.chat, {
                    video: { url: result.videoUrl },
                    caption: captionText,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else {
                throw new Error("Gagal memuat video CapCut.");
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('CapCut dl error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mengunduh CapCut: ${err?.message || err}`);
        }
        return true;
    }
};
