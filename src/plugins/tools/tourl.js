const { downloadToolMediaSafely, resolveToolMediaMeta } = require('./_helper');

module.exports = {
    name: 'tourl',
    category: 'tools',
    commands: ['tourl', 'upload', 'tolink'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, mime, qmsg, isCreator, Reply, example, checkLimit, addLimit,
            uploadUniversalTourl, getMimeExt
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const { hasMedia, mimeType, fileName } = resolveToolMediaMeta(m, qmsg, quoted, mime);
        if (!hasMedia) return Reply(example("gambar / video / audio / stiker / dokumen"));

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        try {
            const buffer = await downloadToolMediaSafely(Dinz, m, qmsg, quoted);
            if (!buffer) throw new Error("Gagal mengunduh media dari WhatsApp.");
            const res = await uploadUniversalTourl(buffer, mimeType, fileName);

            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
            const sizeStr = sizeMb >= 1 ? `${sizeMb} MB` : `${(buffer.length / 1024).toFixed(1)} KB`;

            await Reply(`\`⌜ Media To URL ⌟\`\n> ◦ *Host :* ${res.provider}\n> ◦ *Format :* ${String(res.ext || getMimeExt(mimeType, fileName, buffer)).toUpperCase()}\n> ◦ *File Size :* ${sizeStr}\n> ◦ *Direct URL :* ${res.url}`);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengunggah media: ${e.message}`);
        }
        return true;
    }
};
