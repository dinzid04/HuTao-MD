module.exports = {
    name: 'ayat',
    category: 'islami',
    commands: ['ayat', 'bacaayat'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, axios, checkLimit, addLimit,
            ISLAMIC_ENGINE
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const parts = (text || '').trim().split(/[\s:]+/);
        const surahNum = parseInt(parts[0]) || 1;
        const ayahNum = parseInt(parts[1]) || 1;

        await Dinz.sendMessage(m.chat, { react: { text: "📖", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getAyat(surahNum, ayahNum);
        if (!res.success) return Reply(res.message);

        await Reply(res.message);
        if (res.audioUrl) {
            try {
                const aRes = await axios.get(res.audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
                await Dinz.sendMessage(m.chat, {
                    audio: Buffer.from(aRes.data),
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: m });
            } catch (_) {}
        }
        addLimit(m.sender, isCreator);
        return true;
    }
};
