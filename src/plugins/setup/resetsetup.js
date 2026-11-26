const {
    MAIN_DEFAULT_CONFIG,
    formatCard,
    requireMainSetupAccess,
    updateSettingsScalar,
    updateSettingsImage,
    updateSettingsPayment,
    clearMediaCaches
} = require('./_helper');

module.exports = {
    name: 'resetsetup',
    category: 'setup',
    commands: ['resetsetup', 'resetbotconfig'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, args, Reply, database, usedPrefix } = ctx;

        const confirm = (args[0] || '').toLowerCase();
        if (confirm !== 'confirm' && confirm !== 'ya' && confirm !== 'yes') {
            return Reply(formatCard({
                icon: '⚠️',
                title: 'KONFIRMASI RESET CONFIG BOT UTAMA',
                body:
                    `Tindakan ini akan mengembalikan Nama Bot, Nama Owner, Packname, ASCII Name, Global Image, Global Payment, dan status Audio Menu bot utama ke pengaturan default.\n\n` +
                    `Ketik \`${usedPrefix}resetsetup confirm\` untuk melanjutkan.`
            }));
        }

        updateSettingsScalar('botname', MAIN_DEFAULT_CONFIG.botname);
        updateSettingsScalar('namaOwner', MAIN_DEFAULT_CONFIG.namaOwner);
        updateSettingsScalar('packname', MAIN_DEFAULT_CONFIG.packname);
        updateSettingsScalar('asciiName', MAIN_DEFAULT_CONFIG.asciiName);
        updateSettingsScalar('asciiFont', MAIN_DEFAULT_CONFIG.asciiFont);
        updateSettingsScalar('audiomenu', MAIN_DEFAULT_CONFIG.audiomenu, { isBoolean: true });
        updateSettingsImage({ ...MAIN_DEFAULT_CONFIG.image });
        updateSettingsPayment({ ...MAIN_DEFAULT_CONFIG.payment });

        if (!global.db.settings) global.db.settings = {};
        global.db.settings.audiomenu = true;
        clearMediaCaches();
        try { await database.write(global.db); } catch (_) {}

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🔄',
            title: 'CONFIG BOT UTAMA DIRESET',
            rows: [
                { label: 'Nama Bot', value: MAIN_DEFAULT_CONFIG.botname },
                { label: 'Nama Owner', value: MAIN_DEFAULT_CONFIG.namaOwner },
                { label: 'Packname', value: MAIN_DEFAULT_CONFIG.packname },
                { label: 'ASCII Name', value: MAIN_DEFAULT_CONFIG.asciiName },
                { label: 'Audio Menu', value: '🟢 Aktif (ON)' }
            ],
            footer: 'Nomor owner utama tidak diubah demi keamanan akses owner.'
        }));
    }
};
