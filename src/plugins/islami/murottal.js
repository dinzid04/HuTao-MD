module.exports = {
    name: 'murottal',
    category: 'islami',
    commands: ['murottal', 'murrotal', 'audioquran'],

    async execute(ctx) {
        const {
            Dinz, m, text, quoted, isCreator, Reply, axios, checkLimit, addLimit,
            ISLAMIC_ENGINE
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let surahNum = parseInt(text) || 1;
        if (surahNum < 1 || surahNum > 114) surahNum = 1;

        await Dinz.sendMessage(m.chat, { react: { text: "🎧", key: m.key } }).catch(() => {});
        const res = await ISLAMIC_ENGINE.getMurottal(surahNum);
        if (!res.success) return Reply(res.message);

        await Reply(res.message);
        try {
            const aRes = await axios.get(res.audioUrl, { responseType: 'arraybuffer', timeout: 45000 });
            await Dinz.sendMessage(m.chat, {
                audio: Buffer.from(aRes.data),
                mimetype: 'audio/mp4',
                ptt: false
            }, { quoted: m });
        } catch (e) {
            Reply(`❌ Gagal mengunduh audio murottal: ${e.message}`);
        }
        addLimit(m.sender, isCreator);
        return true;
    }
};
