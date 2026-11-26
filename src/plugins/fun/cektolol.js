module.exports = {
    name: 'cektolol',
    category: 'fun',
    commands: ['cektolol', 'cekbego', 'tololcek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Sangat jenius dalam hal-hal yang tidak berguna 🗿",
            "Otak 4G tapi sinyalnya sering Edge 📶",
            "Kadang loading lama kayak modem jaman purba ⏳",
            "Pintar tapi pura-pura bego biar gak disuruh-suruh 🧠",
            "Aman, masih bisa bedain mana garam mana micin 🧂",
            "Jenius tak tertandingi, Einstein pun sungkem! 🎓"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Ketololan ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
