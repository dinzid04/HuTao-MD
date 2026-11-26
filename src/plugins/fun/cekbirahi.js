module.exports = {
    name: 'cekbirahi',
    category: 'fun',
    commands: ['cekbirahi', 'birahicek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Bahaya! Harap segera ambil wudhu atau nikah sekarang juga! 🚨",
            "Lagi membara, butuh pendingin ruangan! 🔥",
            "Tingkat tinggi! Jangan biarkan dia sendirian di kamar! 🔞",
            "Sedang-sedang saja, masih bisa ditahan dengan nonton ceramah 😇",
            "Tenang dan suci, terbebas dari godaan duniawi 🧘‍♂️",
            "Hati adem ayem seperti es kutub ❄️"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Birahi ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
