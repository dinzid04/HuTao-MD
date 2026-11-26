const { callEngine } = require('./_helper');

module.exports = {
    name: 'stopcall',
    category: 'call',
    commands: ['stopcall', 'hangup', 'endcall'],

    async execute(ctx) {
        const { Dinz, m, text, Reply } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '🛑', key: m.key } }).catch(() => {});
        try {
            const res = await callEngine.stopCalls();
            const stopped = Number(res?.stopped || 0);
            return Reply(stopped > 0
                ? `🛑 Berhasil menghentikan *${stopped}* panggilan aktif beserta antreannya.`
                : 'ℹ️ Tidak ada panggilan aktif yang sedang berjalan.'
            );
        } catch (err) {
            return Reply(`❌ Gagal menghentikan panggilan: ${err.message}`);
        }
        return true;
    }
};
