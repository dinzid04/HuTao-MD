module.exports = {
    name: 'hd',
    category: 'maker',
    commands: ['hd', 'remini', 'upscale'],

    async execute(ctx) {
        const { Dinz, m, args, text, quoted, isCreator, Reply, checkLimit, addLimit, upscaleImage } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!/image/i.test(mime)) {
            return Reply("📸 Balas / kirim foto dengan caption *hd* atau *remini* untuk meningkatkan kualitas gambar menjadi HD.");
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const userImageBuffer = await q.download();
            if (!userImageBuffer) throw new Error("Gagal mengunduh gambar Anda.");

            const multiplier = (args[0] === '4' || args[0] === '4x') ? 4 : 2;
            const upscaledBuffer = await upscaleImage(userImageBuffer, multiplier);

            await Dinz.sendMessage(m.chat, {
                image: upscaledBuffer,
                caption: `\`⌜ AI Image Upscaler (HD) ⌟\`\n> ◦ *Status :* Sukses Ditingkatkan\n> ◦ *Skala :* ${multiplier}x AI Super Resolution`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('HD Upscale Error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal meningkatkan kualitas gambar: ${err?.message || err}`);
        }
        return true;
    }
};
