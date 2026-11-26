module.exports = {
    name: 'setlimitharian',
    category: 'owner',
    commands: ['setlimitharian', 'setlimitdefault'],

    async execute(ctx) {
        const { text, isCreator, Reply, setDefaultDailyLimit, getLimitConfig } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const amount = parseInt(text);
        if (!text || isNaN(amount) || amount < 1) {
            const currentConfig = getLimitConfig();
            return Reply(`\`⌜ Set Limit Harian Default ⌟\`
> ◦ *Limit Default Saat Ini :* ${currentConfig.defaultLimit || 25} limit/hari
> ◦ *Cara Penggunaan:* setlimitharian <jumlah>
> ◦ *Contoh:* setlimitharian 30`);
        }

        const updatedLimit = setDefaultDailyLimit(amount);
        return Reply(`\`⌜ Limit Harian Diubah ⌟\`\n> ◦ *Limit Default Baru :* ${updatedLimit} limit/hari\n> ◦ *Status :* Berlaku permanen untuk semua pengguna`);
    }
};
