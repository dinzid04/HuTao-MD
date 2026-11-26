const { downloadToolMediaSafely, resolveToolMediaMeta } = require('./_helper');

module.exports = {
    name: 'pixhost',
    category: 'tools',
    commands: ['pixhost'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            uploadPixhost, getMimeExt
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const { hasMedia, mimeType, fileName } = resolveToolMediaMeta(m, qmsg, quoted, mime);
        if (!hasMedia) return Reply(example("gambar atau foto"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            const buffer = await downloadToolMediaSafely(Dinz, m, qmsg, quoted);
            if (!buffer) throw new Error("Gagal mengunduh media.");
            const ext = getMimeExt(mimeType, fileName, buffer);
            const url = await uploadPixhost(buffer, ext);

            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
            const sizeStr = sizeMb >= 1 ? `${sizeMb} MB` : `${(buffer.length / 1024).toFixed(1)} KB`;

            await Reply(`\`⌜ Pixhost Uploader ⌟\`\n> ◦ *File Size :* ${sizeStr}\n> ◦ *Format :* ${ext.toUpperCase()}\n> ◦ *Direct URL :* ${url}`);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal upload ke Pixhost: ${e.message}`);
        }
        return true;
    }
};
