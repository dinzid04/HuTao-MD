module.exports = {
    name: 'cekjodoh',
    category: 'fun',
    commands: ['cekjodoh', 'jodohcek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || 'Kamu dan Dia';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Cocok banget! Tinggal nunggu restu orang tua dan gedung 💍",
            "99% jodoh, 1% terhalang restu calon mertua 🥲",
            "Cocok jadi teman hidup, minimal teman mengeluh bareng 🤝",
            "Jodoh ada di tangan Tuhan, tapi kalau gak usaha ya jomblo terus 🗿",
            "Masih ambigu, mending saling mengenal dulu daripada nyesel 🍵",
            "Kurang cocok, mending cari yang lain daripada makan hati 💔"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Kecocokan Jodoh ⌟\`
> ◦ *Pasangan :* ${target}
> ◦ *Kecocokan :* *${percent}%*
> ◦ *Prediksi :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
