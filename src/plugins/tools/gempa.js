module.exports = {
    name: 'gempa',
    category: 'tools',
    commands: ['gempa', 'gempabmkg', 'bmkg'],

    async execute(ctx) {
        const { Dinz, m, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/gempa-bmkg?apikey=${apiKey}`);
            const data = res.data?.result;
            if (!data || !data.wilayah) throw new Error("Gagal mengambil data BMKG.");

            const captionTxt = `\`⌜ BMKG Gempa Terkini ⌟\`
> ◦ *Wilayah :* ${data.wilayah}
> ◦ *Magnitude :* ${data.magnitude || '-'}
> ◦ *Kedalaman :* ${data.kedalaman || '-'}
> ◦ *Waktu :* ${data.tanggal || ''} - ${data.jam || ''}
> ◦ *Koordinat :* ${data.lintang || ''}, ${data.bujur || ''}
> ◦ *Potensi :* ${data.potensi || 'Tidak berpotensi tsunami'}`;

            if (data.shakemap) {
                try {
                    const imgRes = await axios.get(data.shakemap, { responseType: 'arraybuffer', timeout: 25000 });
                    await Dinz.sendMessage(m.chat, {
                        image: Buffer.from(imgRes.data),
                        caption: captionTxt
                    }, { quoted: m });
                } catch (eImg) {
                    await Reply(captionTxt);
                }
            } else {
                await Reply(captionTxt);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengambil info gempa: ${e.message}`);
        }
        return true;
    }
};
