module.exports = {
    name: 'cekbaper',
    category: 'fun',
    commands: ['cekbaper', 'bapercek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Dibalas 'wkwk' aja langsung kepikiran sampai 3 purnama 😭",
            "Hati terbuat dari kerupuk basah, rapuh banget! 💔",
            "Gampang tersentuh, dengar lagu galau dikit langsung nangis 🥺",
            "Cukup peka terhadap kode-kode tipis 👀",
            "Hati sekeras batu karang, anti baper baper club! 🗿",
            "Hati sedingin kulkas dua pintu 🧊"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Baper ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
