module.exports = {
    name: 'facebook',
    category: 'downloader',
    commands: ['facebook', 'fb', 'fbdl'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, example, checkLimit, addLimit,
            downloadFacebook
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let targetUrl = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!targetUrl || targetUrl.trim().length === 0) {
            return Reply(example("https://www.facebook.com/share/r/1DP7ECk3Cf/"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const result = await downloadFacebook(targetUrl);
            const captionText = `\`⌜ Facebook Downloader ⌟\`\n> ◦ *Judul :* ${result.title || 'Facebook Video'}\n> ◦ *Kualitas :* ${result.quality || 'HD'}`;

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
                throw new Error("Gagal memuat video Facebook.");
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Facebook dl error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat mengunduh Facebook: ${err?.message || err}`);
        }
        return true;
    }
};
