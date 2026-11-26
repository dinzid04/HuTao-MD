const { formatCard, requireMainSetupAccess, updateSettingsScalar } = require('./_helper');

module.exports = {
    name: 'setpackname',
    category: 'setup',
    commands: ['setpackname', 'setpack', 'setwm'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, text, Reply, example } = ctx;

        const newPack = (text || '').trim();
        if (!newPack) {
            return Reply(example('HuTao - MD Sticker'));
        }
        if (newPack.length > 60) {
            return Reply('❌ Packname maksimal 60 karakter.');
        }

        const oldPack = global._mainConfig?.packname || global.packname || '-';
        updateSettingsScalar('packname', newPack);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '🖼️',
            title: 'PACKNAME STIKER BOT UTAMA DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldPack },
                { label: 'Baru', value: newPack },
                { label: 'Info', value: 'Otomatis dipakai saat membuat stiker baru' },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
