const { formatCard, requireMainSetupAccess, updateSettingsScalar } = require('./_helper');

module.exports = {
    name: 'setnamaowner',
    category: 'setup',
    commands: ['setnamaowner', 'setownername', 'renameowner'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, text, Reply, example } = ctx;

        const newName = (text || '').trim();
        if (!newName) {
            return Reply(example('DinzID'));
        }
        if (newName.length > 60) {
            return Reply('❌ Nama owner maksimal 60 karakter.');
        }

        const oldName = global._mainConfig?.namaOwner || global.namaOwner || '-';
        updateSettingsScalar('namaOwner', newName);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '🪪',
            title: 'NAMA OWNER BOT UTAMA DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldName },
                { label: 'Baru', value: newName },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
