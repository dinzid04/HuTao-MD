const { formatCard, requireClonerOwner, patchCloneConfig } = require('./_helper');

module.exports = {
    name: 'cloneascii',
    category: 'cloner',
    commands: ['cloneascii', 'cloneasciiname', 'clonebanner'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, args, text, Reply, botCtx, jadibotMgr, usedPrefix } = ctx;

        const id = botCtx.getJadibotIdentity(cloneNum);
        const raw = (text || '').trim();
        if (!raw) {
            return Reply(formatCard({
                icon: '🖥️',
                title: 'SET ASCII NAME CLONE',
                rows: [
                    { label: 'ASCII Name Saat Ini', value: id.asciiName || id.botname || '-' },
                    { label: 'ASCII Font Saat Ini', value: id.asciiFont || 'ANSI Shadow' }
                ],
                body:
                    `📌 *Cara Penggunaan:*\n` +
                    `> ◦ \`${usedPrefix}cloneascii Nama Banner Clone\`\n` +
                    `> ◦ \`${usedPrefix}cloneascii font Larry 3D\``
            }));
        }

        if ((args[0] || '').toLowerCase() === 'font') {
            const newFont = args.slice(1).join(' ').trim();
            if (!newFont) return Reply(`📌 Contoh: \`${usedPrefix}cloneascii font ANSI Shadow\``);
            const updated = patchCloneConfig(cloneNum, { asciiFont: newFont }, botCtx, jadibotMgr);
            Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), asciiFont: updated.asciiFont };
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '🖥️',
                title: 'ASCII FONT CLONE DIUBAH',
                rows: [
                    { label: 'Sebelumnya', value: id.asciiFont },
                    { label: 'Baru', value: updated.asciiFont },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        if (raw.length > 50) return Reply('❌ ASCII Name clone maksimal 50 karakter.');

        const updated = patchCloneConfig(cloneNum, { asciiName: raw }, botCtx, jadibotMgr);
        Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), asciiName: updated.asciiName };
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖥️',
            title: 'ASCII NAME CLONE DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: id.asciiName },
                { label: 'Baru', value: updated.asciiName },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
