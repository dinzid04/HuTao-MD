module.exports = {
    name: 'claim',
    category: 'owner',
    commands: ['claim'],

    async execute(ctx) {
        const { m, isCreator, Reply, claimLimit } = ctx;

        if (isCreator) {
            return Reply("❌ Owner bot memiliki akses *Unlimited Limit*, tidak perlu claim.");
        }

        const res = claimLimit(m.sender);
        if (res.success) {
            return Reply(`🎉 *Claim Berhasil!* \n> ◦ ${res.message}\n> ◦ Ketik *limit* untuk memeriksa sisa kuotamu.`);
        } else {
            return Reply(`⚠️ *Claim Gagal*\n> ◦ ${res.message}`);
        }
        return true;
    }
};
