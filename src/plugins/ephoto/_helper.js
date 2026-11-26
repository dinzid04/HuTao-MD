const { createEphoto, getEphotoMenuList } = require('../../services/ephoto');

async function runEphotoEffect(ctx, effectKey) {
    const { Dinz, m, command, text, isCreator, Reply, checkLimit, addLimit } = ctx;
    if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
    if (!text || !text.trim()) {
        return Reply(`\`⌜ Ephoto 360 ⌟\`\n> ◦ *Format :* ${command} teks\n> ◦ *Contoh :* ${command} ${global.botname}`);
    }

    await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});

    try {
        const res = await createEphoto(effectKey || command, text.trim());

        await Dinz.sendMessage(m.chat, {
            image: { url: res.url },
            caption: `\`⌜ Ephoto 360 ⌟\`\n> ◦ *Efek :* ${res.name}\n> ◦ *Teks :* ${text.trim()}`
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

module.exports = {
    createEphoto,
    getEphotoMenuList,
    runEphotoEffect
};
