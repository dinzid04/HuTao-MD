module.exports = {
    name: 'addptam',
    category: 'am',
    commands: ['addptam'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, amRoles } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const targetNum = getTargetNumber(m, text);
        if (!targetNum || targetNum.length < 5) {
            return Reply(`\`⌜ Tambah PT AM ⌟\`\n> ◦ *Format :* ${command} <nomor/tag>\n> ◦ *Contoh :* ${command} 6281234567890\n> ◦ *Contoh :* ${command} @user`);
        }

        const res = amRoles.addPt(targetNum);
        if (!res.ok) return Reply(`❌ ${res.message}`);
        return Reply(`\`⌜ Sukses Tambah PT AM ⌟\`\n> ◦ *Nomor :* ${res.number}\n> ◦ *Info :* PT AM dapat menambah reseller sendiri`, [res.number + '@s.whatsapp.net']);
    }
};
