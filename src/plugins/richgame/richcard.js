const { formatCard, sendRichCard } = require('./_helper');

module.exports = {
    name: 'richcard',
    category: 'richgame',
    commands: ['richcard', 'richmsg'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix } = ctx;

        if (!text) {
            return Reply(formatCard({
                icon: '✨',
                title: 'RICH CARD BUILDER',
                body: `Kirim pesan kartu Meta AI + tombol saran cepat.\n\nFormat:\n\`${usedPrefix}richcard Judul | Isi teks | Saran1, Saran2\`\n\nContoh:\n\`${usedPrefix}richcard Info | Halo semua! | .menu, .richgame\``
            }));
        }
        const parts = text.split('|').map((s) => s.trim());
        const title = parts.length >= 2 ? parts[0] : (botCtx.getBotIdentity(Dinz).botname || global.botname || 'HuTao - MD');
        const bodyText = parts.length >= 2 ? parts[1] : parts[0];
        const suggestions = parts[2] ? parts[2].split(',').map((s) => s.trim()).filter(Boolean) : [];

        await sendRichCard(Dinz, m, {
            title,
            text: bodyText,
            suggestions,
            footer: `© ${botCtx.getBotIdentity(Dinz).botname}`
        });
        return true;
    }
};
