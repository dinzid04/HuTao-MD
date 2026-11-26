const { callEngine } = require('./_helper');

module.exports = {
    name: 'clearqueue',
    category: 'call',
    commands: ['clearqueue', 'hapusantrean', 'clearcallqueue'],

    async execute(ctx) {
        const { Reply } = ctx;

        try {
            const res = await callEngine.clearCallQueue();
            const cleared = Number(res?.cleared || 0);
            return Reply(cleared > 0
                ? `🗑️ Berhasil menghapus *${cleared}* lagu dari daftar antrean. Lagu *${res.nowPlaying || 'saat ini'}* tetap berputar.`
                : 'ℹ️ Daftar antrean sudah kosong.'
            );
        } catch (err) {
            return Reply(`❌ Gagal membersihkan antrean: ${err.message}`);
        }
        return true;
    }
};
