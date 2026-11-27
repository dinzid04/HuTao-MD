const yts = require('yt-search');

module.exports = {
    name: 'ytstalk',
    category: 'stalk',
    commands: ['ytstalk', 'stalkyt', 'youtubestalk'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = String(text || '').trim().replace(/^@/, '');
        if (!q) return Reply(`▶️ Masukkan nama/handle channel YouTube!\n> Contoh: \`${usedPrefix || '.'}ytstalk MrBeast\``);

        await Dinz.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }).catch(() => {});
        try {
            const res = await yts(q);
            const ch = res?.channels?.[0];
            if (!ch) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Channel YouTube *${q}* tidak ditemukan.`);
            }

            const caption =
                `\`▶️ YOUTUBE CHANNEL STALKER\`\n` +
                `> ◦ *Channel :* ${ch.name || '-'}\n` +
                `> ◦ *Subscriber :* ${ch.subCountLabel || Number(ch.subCount || 0).toLocaleString('id-ID')}\n` +
                `> ◦ *Total Video :* ${ch.videoCountLabel || ch.videoCount || '-'}\n` +
                `> ◦ *Link :* ${ch.url || '-'}`;

            const thumb = ch.image || ch.thumbnail;
            if (thumb) {
                const fullThumb = thumb.startsWith('//') ? `https:${thumb}` : thumb;
                try {
                    await Dinz.sendMessage(m.chat, { image: { url: fullThumb }, caption }, { quoted: m });
                    addLimit(m.sender, isCreator);
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    return true;
                } catch (_) {}
            }

            await Reply(caption);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal stalk YouTube: ${err?.message || err}`);
        }
        return true;
    }
};
