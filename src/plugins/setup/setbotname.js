const { formatCard, requireMainSetupAccess, updateSettingsScalar } = require('./_helper');

module.exports = {
    name: 'setbotname',
    category: 'setup',
    commands: ['setbotname', 'setnamabot', 'renamebot'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, text, Reply, example } = ctx;

        const newName = (text || '').trim();
        if (!newName) {
            return Reply(example('HuTao - MD'));
        }
        if (newName.length > 60) {
            return Reply('❌ Nama bot maksimal 60 karakter.');
        }

        const oldName = global._mainConfig?.botname || global.botname || '-';
        updateSettingsScalar('botname', newName);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '🤖',
            title: 'NAMA BOT UTAMA DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldName },
                { label: 'Baru', value: newName },
                { label: 'Penyimpanan', value: 'Permanen di settings.js (Bot Utama)' }
            ]
        }));
    }
};
