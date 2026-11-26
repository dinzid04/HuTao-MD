module.exports = {
    name: 'cekcantik',
    category: 'fun',
    commands: ['cekcantik', 'cantikcek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Bidadari tak bersayap turun ke bumi 😍",
            "Manisnya kelewatan sampai bikin diabetes! ✨",
            "Cakep standar internasional! 💖",
            "Cantik natural tanpa filter ✨",
            "Masih butuh sedikit bedak dan wudhu biar makin glowing 💄",
            "Cantik dari dalam hati... kalau dari luar ya lumayan lah 🗿",
            "Buram banget, kayak masa depan mantan 😭"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Kecantikan ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
