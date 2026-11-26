const { callEngine, toMono } = require('./_helper');

module.exports = {
    name: 'skipcall',
    category: 'call',
    commands: ['skipcall', 'nextcall', 'callskip', 'callnext'],

    async execute(ctx) {
        const { Dinz, m, text, Reply } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏭️', key: m.key } }).catch(() => {});
        try {
            const res = await callEngine.skipCallTrack();
            if (!res?.skipped) {
                return Reply('ℹ️ Tidak ada panggilan aktif yang bisa dilewati.');
            }
            if (res.ended) {
                return Reply(`⏹️ *${res.prevTitle || 'Lagu'}* dilewati — tidak ada lagu lagi di antrean, panggilan diakhiri.`);
            }
            return Reply(
                `⏭️ *Berhasil skip ke lagu berikutnya!*\n\n` +
                `> ᴍᴇᴍᴜᴛᴀʀ : *${res.nowPlaying || '-'}*\n` +
                `> ʀᴇǫᴜᴇsᴛ : ${res.requestedBy || '-'}\n` +
                `> ᴋᴜᴀʟɪᴛᴀs : ${toMono(res.quality || '-')}\n` +
                `> sɪsᴀ ᴀɴᴛʀᴇᴀɴ : ${toMono(`${res.queueLength || 0} lagu`)}`
            );
        } catch (err) {
            return Reply(`❌ Gagal skip lagu call: ${err.message}`);
        }
        return true;
    }
};
