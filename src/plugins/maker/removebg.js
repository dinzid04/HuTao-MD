module.exports = {
    name: 'removebg',
    category: 'maker',
    commands: ['removebg', 'nobg', 'hapusbg', 'rbg'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, checkLimit, addLimit, removeBackground } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!/image/i.test(mime)) {
            return Reply("📸 Balas / kirim foto dengan caption *removebg* untuk menghapus latar belakang (background) gambar.");
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const userImageBuffer = await q.download();
            if (!userImageBuffer) throw new Error("Gagal mengunduh gambar Anda.");

            const noBgBuffer = await removeBackground(userImageBuffer);

            await Dinz.sendMessage(m.chat, {
                image: noBgBuffer,
                caption: `\`⌜ AI Background Remover ⌟\`\n> ◦ *Status :* Background Berhasil Dihapus\n> ◦ *Format :* Transparent PNG`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('RemoveBG Error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal menghapus background gambar: ${err?.message || err}`);
        }
        return true;
    }
};
