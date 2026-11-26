module.exports = {
    name: 'cekpintar',
    category: 'fun',
    commands: ['cekpintar', 'pintarcek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Otak berkecepatan 1000 IQ, super jenius! 🚀",
            "Pintar mencari alasan saat ditagih utang 🗿",
            "Pintar dalam memanfaatkan situasi dan diskon 🛍️",
            "Cerdas di bidang gosip dan stalking mantan 🕵️",
            "Pintar standar anak sekolahan 📚",
            "Masih dalam tahap pengembangan kecerdasan buatan ⚙️"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Kepintaran ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
