const stickerly = require('../../services/stickerly');

module.exports = {
    name: 'stikerlydl',
    category: 'sticker',
    commands: ['stikerlydl', 'stickerlydl', 'slydl', 'dlstikerly'],

    async execute(ctx) {
        const { Dinz, m, args, text, isCreator, Reply, example, checkLimit, addLimit, usedPrefix } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const raw = String(text || '').trim();
        if (!raw) {
            return Reply(example(`1  atau  https://sticker.ly/s/8IS9M7\n> ◦ Tips: Cari dulu pakai \`${usedPrefix}stikerly <kata kunci>\` lalu ketik angkanya.`));
        }

        const firstArg = (args && args[0] ? args[0] : raw.split(/\s+/)[0]).trim();
        const forceSingle = /\b(single|satuan|pisah)\b/i.test(raw);
        let targetUrl = '';
        let previewName = '';

        if (/^\d{1,2}$/.test(firstArg)) {
            const idx = parseInt(firstArg, 10);
            const session = stickerly.getSearchSession(Dinz, m.chat, m.sender);
            if (!session || !Array.isArray(session.items) || idx < 1 || idx > session.items.length) {
                return Reply(`❌ Nomor *${idx}* tidak ditemukan di sesi pencarian terakhir.\n> ◦ Cari dulu dengan \`${usedPrefix}stikerly <kata kunci>\` lalu pilih nomornya.`);
            }
            const picked = session.items[idx - 1];
            targetUrl = picked.shareUrl;
            previewName = picked.name;
        } else {
            targetUrl = stickerly.normalizeStickerlyUrl(firstArg);
            if (!targetUrl) {
                return Reply(`❌ Input tidak valid. Masukkan nomor hasil pencarian atau URL Sticker.ly (contoh: \`${usedPrefix}stikerlydl https://sticker.ly/s/8IS9M7\`).`);
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        await Reply(
            `\`⌜ Mengunduh Sticker Pack ⌟\`\n` +
            `> ◦ *Pack :* ${previewName || targetUrl}\n` +
            `> ◦ *Mode :* ${forceSingle ? 'Stiker Satuan' : 'Native WhatsApp Sticker Pack 📦'}\n` +
            `> ◦ *Status :* Sedang mengunduh & mengemas stiker...`
        );

        try {
            const packData = await stickerly.downloadStickerly(targetUrl);

            if (!forceSingle) {
                try {
                    const packRes = await stickerly.sendNativeStickerPack(Dinz, m.chat, packData, m, {
                        packname: packData.name || global.packname,
                        author: packData.author || global.namaOwner
                    });

                    addLimit(m.sender, isCreator);
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    await Reply(
                        `\`⌜ Sticker Pack Terkirim 📦 ⌟\`\n` +
                        `> ◦ *Nama Pack :* ${packRes.name}\n` +
                        `> ◦ *Author :* @${packRes.publisher}\n` +
                        `> ◦ *Jumlah :* ${packRes.count} stiker (${(packRes.zipBytes / 1024).toFixed(1)} KB)\n` +
                        `> ◦ *Tips :* Ketuk paket stiker di atas lalu pilih *Tambah ke Stiker Saya*.\n` +
                        `> ◦ *Mode Satuan :* \`${usedPrefix}stikerlydl ${firstArg} single\``
                    );
                    return true;
                } catch (packErr) {
                    console.log('[Stikerly NativePack fallback to single]:', packErr?.message || packErr);
                    await Reply(`⚠️ Pengiriman native Sticker Pack gagal (${packErr.message}). Mengirim stiker satu per satu (maks 10 stiker)...`);
                }
            }

            const maxSingle = Math.min(packData.stickers.length, 10);
            let sent = 0;
            for (let i = 0; i < maxSingle; i++) {
                try {
                    await Dinz.sendAsSticker(m.chat, packData.stickers[i], m, {
                        packname: packData.name || global.packname,
                        author: packData.author || global.namaOwner
                    });
                    sent++;
                    await new Promise((r) => setTimeout(r, 700));
                } catch (_) {}
            }

            if (sent === 0) throw new Error('Semua stiker gagal dikirim.');
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            await Reply(`✅ Selesai mengirim *${sent}/${packData.stickers.length}* stiker dari pack *${packData.name}*.`);
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengunduh pack Sticker.ly: ${err.message}`);
        }
        return true;
    }
};
