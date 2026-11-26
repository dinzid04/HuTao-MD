const { formatCard, toMono, requireMainSetupAccess, updateSettingsScalar, normalizeWaNumber } = require('./_helper');

module.exports = {
    name: 'setowner',
    category: 'setup',
    commands: ['setowner', 'setnoowner', 'setnomorowner'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, text, Reply, example, getTargetNumber } = ctx;

        const rawTarget = getTargetNumber(m, text);
        const newOwner = normalizeWaNumber(rawTarget || text);
        if (!newOwner || newOwner.length < 8 || newOwner.length > 16) {
            return Reply(example('6281234567890 (atau tag/reply nomor)'));
        }

        const oldOwner = global._mainConfig?.owner || global.owner || '-';
        updateSettingsScalar('owner', newOwner);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '👑',
            title: 'NOMOR OWNER BOT UTAMA DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: toMono(oldOwner) },
                { label: 'Baru', value: toMono(newOwner) },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }), [`${newOwner}@s.whatsapp.net`]);
    }
};
