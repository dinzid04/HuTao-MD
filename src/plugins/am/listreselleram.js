module.exports = {
    name: 'listreselleram',
    category: 'am',
    commands: ['listreselleram', 'reselleramlist'],

    async execute(ctx) {
        const { m, isCreator, Reply, getSenderNumber, amRoles } = ctx;

        const senderNum = getSenderNumber(m);
        if (!amRoles.canManageReseller(senderNum, isCreator)) {
            return Reply(`\`⌜ Access Denied ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Fitur khusus Owner dan PT AM*`);
        }

        const filterBy = isCreator ? null : senderNum;
        const list = amRoles.listReseller(filterBy);
        if (list.length === 0) {
            return Reply(`\`⌜ Daftar Reseller AM ⌟\`\n> ◦ Belum ada reseller terdaftar${filterBy ? ' di bawah PT AM ini' : ''}.`);
        }

        const listTxt = list.map((r, i) => `> *${i + 1}.* @${r.id}\n> ◦ *Kuota :* ${r.used}/${r.quota}\n> ◦ *Sisa :* ${Math.max(0, r.quota - r.used)}${r.addedBy ? `\n> ◦ *Oleh PT :* ${r.addedBy}` : ''}`).join('\n\n');
        const mentions = list.map(r => r.id + '@s.whatsapp.net');
        return Reply(`\`⌜ Daftar Reseller AM (${list.length}) ⌟\`\n\n${listTxt}`, mentions);
    }
};
