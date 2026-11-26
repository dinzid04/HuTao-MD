module.exports = {
    name: 'fakeff',
    category: 'maker',
    commands: ['fakeff'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(`📌 *Contoh Penggunaan:*\n> ◦ ${command} Alipp|18\n> ◦ ${command} Alipp`);
        }

        let [name, number] = text.split('|').map(s => s.trim());
        if (!name) {
            return Reply(`📌 *Format salah!*\n> ◦ Contoh: ${command} Alipp|18`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const paramNomor = number ? encodeURIComponent(number) : '';
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/fakeff?apikey=${apiKey}&nama=${encodeURIComponent(name)}&nomor=${paramNomor}`;

            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('application/json')) {
                const errData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
                await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal: ${errData.error || 'Terjadi kesalahan pada API'}`);
            }

            const imageBuffer = Buffer.from(response.data);
            let captionTxt = `\`⌜ Fake Lobby Free Fire ⌟\`\n> ◦ *Nama :* ${name}`;
            if (number) captionTxt += `\n> ◦ *Nomor :* ${number}`;
            else captionTxt += `\n> ◦ *Nomor :* Random`;

            await Dinz.sendMessage(m.chat, {
                image: imageBuffer,
                caption: captionTxt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('[fakeff-error]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat fake lobby Free Fire: ${e.message}`);
        }
        return true;
    }
};
