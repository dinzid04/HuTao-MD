module.exports = {
    name: 'ceksange',
    category: 'fun',
    commands: ['ceksange', 'sangecek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Pikiran traveling sampai ke galaxy lain! 🚀🔞",
            "Matanya suka auto fokus ke tempat terlarang 👀",
            "Harap segera disiram air es biar adem! 🧊",
            "Masih batas wajar anak muda 😌",
            "Pikiran suci bersih tanpa noda 😇",
            "Alim tiada tara, malaikat pun tersenyum 🕊️"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Sange ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
