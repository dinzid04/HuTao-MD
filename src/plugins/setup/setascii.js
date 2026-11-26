const { formatCard, requireMainSetupAccess, updateSettingsScalar } = require('./_helper');

module.exports = {
    name: 'setascii',
    category: 'setup',
    commands: ['setascii', 'setasciiname', 'setbanner'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, args, text, Reply, usedPrefix } = ctx;

        const raw = (text || '').trim();
        if (!raw) {
            return Reply(formatCard({
                icon: '🖥️',
                title: 'SET ASCII NAME BOT UTAMA',
                rows: [
                    { label: 'ASCII Name Saat Ini', value: global._mainConfig?.asciiName || global.asciiName || '-' },
                    { label: 'ASCII Font Saat Ini', value: global._mainConfig?.asciiFont || global.asciiFont || 'ANSI Shadow' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> ◦ \`${usedPrefix}setascii Nama Banner Baru\`\n` +
                    `> ◦ \`${usedPrefix}setascii font Larry 3D\` (ubah font ASCII)`
            }));
        }

        if ((args[0] || '').toLowerCase() === 'font') {
            const newFont = args.slice(1).join(' ').trim();
            if (!newFont) return Reply(`📌 Contoh: \`${usedPrefix}setascii font ANSI Shadow\``);
            const oldFont = global._mainConfig?.asciiFont || global.asciiFont || 'ANSI Shadow';
            updateSettingsScalar('asciiFont', newFont);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '🖥️',
                title: 'ASCII FONT BOT UTAMA DIUBAH',
                rows: [
                    { label: 'Sebelumnya', value: oldFont },
                    { label: 'Baru', value: newFont },
                    { label: 'Penyimpanan', value: 'Permanen di settings.js' }
                ]
            }));
        }

        if (raw.length > 50) {
            return Reply('❌ ASCII Name maksimal 50 karakter.');
        }

        const oldAscii = global._mainConfig?.asciiName || global.asciiName || '-';
        updateSettingsScalar('asciiName', raw);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '🖥️',
            title: 'ASCII NAME BOT UTAMA DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldAscii },
                { label: 'Baru', value: raw },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
