module.exports = {
    name: 'cekwibu',
    category: 'fun',
    commands: ['cekwibu', 'wibucek'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let target = text || m.quoted?.pushName || (m.quoted?.sender ? `@${m.quoted.sender.split('@')[0]}` : m.pushName) || 'Kamu';
        const percent = Math.floor(Math.random() * 101);
        const comments = [
            "Bau bawang terdeteksi dari jarak 500 meter! 🧅",
            "Wibu akut! Waifunya ada di 10 dimensi berbeda ⛩️",
            "Sering teriak 'Yamete Kudasai' tengah malam 🗿",
            "Penikmat anime musiman dan waifu sejuta umat 🍙",
            "Wibu santai, cuma nonton anime pas gabut 🍥",
            "Normal, masih kenal dunia nyata dan rumput hijau 🌱"
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];

        const resultTxt = `\`⌜ Cek Tingkat Wibu ⌟\`
> ◦ *Target :* ${target}
> ◦ *Persentase :* *${percent}%*
> ◦ *Catatan :* ${comment}`;

        await Reply(resultTxt);
        addLimit(m.sender, isCreator);
        return true;
    }
};
