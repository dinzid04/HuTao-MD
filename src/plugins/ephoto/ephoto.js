module.exports = {
    name: 'ephoto',
    category: 'ephoto',
    commands: ['ephoto', 'ephoto360'],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (!text || !text.trim()) {
            const { getEphotoMenuList } = require('../../services/ephoto');
            return Reply(getEphotoMenuList() + `\n\n> ◦ *Penggunaan :* luxurygold Teks Kamu\n> ◦ *Atau :* ephoto luxurygold | Teks Kamu`);
        }
        const parts = text.split('|').map(s => s.trim());
        if (parts.length < 2) {
            return Reply(`\`⌜ Ephoto360 ⌟\`\n> ◦ *Format :* ${command} <efek> | <teks>\n> ◦ *Contoh :* ${command} luxurygold | ${global.botname}`);
        }
        const effectKey = parts[0].toLowerCase();
        const effectText = parts.slice(1).join('|').trim();

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});

        try {
            const { createEphoto } = require('../../services/ephoto');
            const res = await createEphoto(effectKey, effectText);

            await Dinz.sendMessage(m.chat, {
                image: { url: res.url },
                caption: `\`⌜ Ephoto 360 ⌟\`\n> ◦ *Efek :* ${res.name}\n> ◦ *Teks :* ${effectText}`
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('ephoto error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat efek gambar: ${err?.message || 'Terjadi kesalahan sistem'}`);
        }
        return true;
    }
};
