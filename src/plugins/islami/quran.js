module.exports = {
    name: 'quran',
    category: 'islami',
    commands: ['quran', 'alquran'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, axios, checkLimit, addLimit,
            ISLAMIC_ENGINE
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let [surahNum, ayahNum] = (text || '1').trim().split(/[\s:]+/).map(s => parseInt(s, 10));
        if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) surahNum = 1;

        await Dinz.sendMessage(m.chat, { react: { text: "📖", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getQuran(surahNum, ayahNum);
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
