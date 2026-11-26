module.exports = {
    name: 'resetlimitall',
    category: 'owner',
    commands: ['resetlimitall'],

    async execute(ctx) {
        const { isCreator, Reply, resetAllLimitUsage } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        resetAllLimitUsage();
        return Reply(`\`⌜ Reset Limit Harian ⌟\`\n> ◦ *Status :* Berhasil\n> ◦ *Info :* Penggunaan limit seluruh user hari ini telah di-reset ke 0.`);
    }
};
