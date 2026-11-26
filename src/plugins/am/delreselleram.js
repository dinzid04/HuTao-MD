module.exports = {
    name: 'delreselleram',
    category: 'am',
    commands: ['delreselleram'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, getSenderNumber, amRoles } = ctx;

        const senderNum = getSenderNumber(m);
        if (!amRoles.canManageReseller(senderNum, isCreator)) {
            return Reply(`\`⌜ Access Denied ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Fitur khusus Owner dan PT AM*`);
        }

        const targetNum = getTargetNumber(m, text);
        if (!targetNum || targetNum.length < 5) {
            return Reply(`\`⌜ Hapus Reseller AM ⌟\`\n> ◦ *Format :* ${command} <nomor/tag>\n> ◦ *Contoh :* ${command} 6281234567890\n> ◦ *Contoh :* ${command} @user`);
        }

        const res = amRoles.delReseller(targetNum);
        if (!res.ok) return Reply(`❌ ${res.message}`);
        return Reply(`\`⌜ Sukses Hapus Reseller AM ⌟\`\n> ◦ *Nomor :* ${res.number}`, [res.number + '@s.whatsapp.net']);
    }
};
