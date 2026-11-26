const { downloadToolMediaSafely, resolveToolMediaMeta } = require('./_helper');

module.exports = {
    name: 'top4top',
    category: 'tools',
    commands: ['top4top'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            uploadTop4Top, getMimeExt
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const { hasMedia, mimeType, fileName } = resolveToolMediaMeta(m, qmsg, quoted, mime);
        if (!hasMedia) return Reply(example("gambar / video / audio / stiker"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            const buffer = await downloadToolMediaSafely(Dinz, m, qmsg, quoted);
            if (!buffer) throw new Error("Gagal mengunduh media.");
            const ext = getMimeExt(mimeType, fileName, buffer);
            const url = (await uploadTop4Top(buffer, mimeType, (mt) => `upload_${Date.now()}.${getMimeExt(mt, fileName, buffer)}`))?.downloadUrl;
            if (!url) throw new Error("Server Top4Top tidak mengembalikan link.");

            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
            const sizeStr = sizeMb >= 1 ? `${sizeMb} MB` : `${(buffer.length / 1024).toFixed(1)} KB`;

            await Reply(`\`⌜ Top4top Uploader ⌟\`\n> ◦ *File Size :* ${sizeStr}\n> ◦ *Format :* ${ext.toUpperCase()}\n> ◦ *Direct URL :* ${url}`);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal upload ke Top4top: ${e.message}`);
        }
        return true;
    }
};
