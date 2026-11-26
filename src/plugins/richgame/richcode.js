const { formatCard, sendRichCode } = require('./_helper');

module.exports = {
    name: 'richcode',
    category: 'richgame',
    commands: ['richcode', 'koderich'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix } = ctx;

        const raw = text || '';
        const pipeIdx = raw.indexOf('|');
        let lang = 'javascript';
        let code = '';

        if (pipeIdx !== -1) {
            lang = raw.slice(0, pipeIdx).trim() || 'javascript';
            code = raw.slice(pipeIdx + 1).trim();
        } else if (m.quoted?.body) {
            lang = raw.trim() || 'javascript';
            code = m.quoted.body.trim();
        }

        if (!code) {
            return Reply(formatCard({
                icon: '💻',
                title: 'RICH CODE BLOCK',
                body: `Kirim blok kode syntax-highlighted gaya Meta AI.\n\nFormat:\n\`${usedPrefix}richcode js | console.log("Halo")\`\nAtau reply pesan kode dengan \`${usedPrefix}richcode python\``
            }));
        }

        await sendRichCode(Dinz, m, {
            language: lang,
            title: `Code (${lang})`,
            intro: `💻 *Code Snippet (${lang.toUpperCase()})*`,
            code,
            footer: `© ${botCtx.getBotIdentity(Dinz).botname}`
        });
        return true;
    }
};
