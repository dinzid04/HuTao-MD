module.exports = {
    name: 'delprem',
    category: 'owner',
    commands: ['delprem', 'hapusprem'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, delPremiumUser } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const targetNum = getTargetNumber(m, text);
        if (!targetNum || targetNum.length < 5) {
            return Reply(`\`⌜ Hapus User Premium ⌟\`\n> ◦ *Format :* ${command} <nomor/tag>\n> ◦ *Contoh :* ${command} ${global.owner}\n> ◦ *Contoh 2 :* ${command} @user`);
        }

        const targetJid = targetNum + '@s.whatsapp.net';
        const removed = delPremiumUser(targetJid);
        if (!removed) {
            return Reply(`⚠️ User @${targetNum} tidak terdaftar di daftar premium.`, [targetJid]);
        }

        return Reply(`\`⌜ Sukses Hapus Premium ⌟\`\n> ◦ *User :* @${targetNum}\n> ◦ *Status :* Status VIP dicabut`, [targetJid]);
    }
};
