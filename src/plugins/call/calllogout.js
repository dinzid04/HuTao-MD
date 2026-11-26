const { callEngine } = require('./_helper');

module.exports = {
    name: 'calllogout',
    category: 'call',
    commands: ['calllogout'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        try {
            await callEngine.logoutCaller();
            return Reply('✅ Sesi akun MeowCaller berhasil dihapus. Gunakan `.callpair <nomor>` untuk menautkan ulang.');
        } catch (err) {
            return Reply(`❌ Gagal logout caller: ${err.message}`);
        }
        return true;
    }
};
