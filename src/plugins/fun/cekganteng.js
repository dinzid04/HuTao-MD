module.exports = {
    name: 'cekganteng',
    category: 'fun',
    commands: ['cekganteng', 'gantengcek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Ketampanan mutlak tak tertandingi! 😎",
            "Ganteng maksimal, idaman para cewek ✨",
            "Ganteng kalem ala CEO drama korea 👔",
            "Lumayan lah, minimal punya wajah 🗿",
            "Muka pas-pasan tapi rezeki insyaAllah lancar 🤲",
            "Ganteng kalau dilihat dari sedotan sambil merem 😭",
            "Pria dengan pesona misterius 🕶️"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Kegantengan ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
