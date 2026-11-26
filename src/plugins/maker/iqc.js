module.exports = {
    name: 'iqc',
    category: 'maker',
    commands: ['iqc', 'iphonequoted', 'qciphone', 'fakeiphone'],

    async execute(ctx) {
        const {
            Dinz, m, text, q, quoted, mime, isCreator, Reply, example, uploadToCDN, moment,
            axios, checkLimit, addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let quoteText = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!quoteText || quoteText.trim().length === 0) {
            return Reply(example("Halo ini pesan iPhone Quoted"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let attachImageUrl = '';
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || '';

            if (/image/.test(mime)) {
                try {
                    const imgBuf = await q.download();
                    const uploaded = await uploadToCDN(imgBuf, mime);
                    if (uploaded) attachImageUrl = uploaded;
                } catch (e) {}
            }

            const timeStr = moment().tz('Asia/Jakarta').format('HH:mm');
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            let apiUrl = `${baseUrl}/imagecreator/iqc?apikey=${apiKey}&time=${encodeURIComponent(timeStr)}&text=${encodeURIComponent(quoteText.trim())}`;
            if (attachImageUrl) {
                apiUrl += `&imageUrl=${encodeURIComponent(attachImageUrl)}`;
            }

            const res = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const resultBuffer = Buffer.from(res.data);
            const hexHeader = resultBuffer.slice(0, 4).toString('hex');

            if (!hexHeader.startsWith('89504e47') && !hexHeader.startsWith('ffd8')) {
                try {
                    const jsonErr = JSON.parse(resultBuffer.toString('utf8'));
                    throw new Error(jsonErr.error || jsonErr.message || "Gagal generate gambar");
                } catch (parseErr) {
                    throw new Error("Server mengembalikan gambar tidak valid.");
                }
            }

            await Dinz.sendMessage(m.chat, {
                image: resultBuffer,
                caption: `\`⌜ iPhone Quoted Maker ⌟\`\n> ◦ *Status :* Sukses Dibuat\n> ◦ *Waktu :* ${timeStr} WIB`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('IQC Error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat iPhone Quoted: ${err?.message || err}`);
        }
        return true;
    }
};
