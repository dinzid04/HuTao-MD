module.exports = {
    name: 'delptam',
    category: 'am',
    commands: ['delptam'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, amRoles } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const targetNum = getTargetNumber(m, text);
        if (!targetNum || targetNum.length < 5) {
            return Reply(`\`⌜ Hapus PT AM ⌟\`\n> ◦ *Format :* ${command} <nomor/tag>\n> ◦ *Contoh :* ${command} 6281234567890\n> ◦ *Contoh :* ${command} @user`);
        }

        const res = amRoles.delPt(targetNum);
        if (!res.ok) return Reply(`❌ ${res.message}`);
        return Reply(`\`⌜ Sukses Hapus PT AM ⌟\`\n> ◦ *Nomor :* ${res.number}`, [res.number + '@s.whatsapp.net']);
    }
};
