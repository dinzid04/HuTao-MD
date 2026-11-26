module.exports = {
    name: 'addreselleram',
    category: 'am',
    commands: ['addreselleram'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, getSenderNumber, amRoles } = ctx;

        const senderNum = getSenderNumber(m);
        if (!amRoles.canManageReseller(senderNum, isCreator)) {
            return Reply(`\`⌜ Access Denied ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Fitur khusus Owner dan PT AM*`);
        }

        let targetNum = '';
        let quota = null;
        const parts = text.trim().split(/\s+/).filter(Boolean);
        const numericParts = [];
        for (const p of parts) {
            if (/^\d+$/.test(p)) numericParts.push(p);
        }
        if (numericParts.length >= 2) {
            quota = parseInt(numericParts[numericParts.length - 1], 10);
            const rawTarget = parts.find(p => !/^\d+$/.test(p) || p.replace(/[^0-9]/g, '').length >= 8);
            targetNum = getTargetNumber(m, rawTarget || '');
        } else if (numericParts.length === 1 && (m.mentionedJid?.length || m.quoted)) {
            quota = parseInt(numericParts[0], 10);
            targetNum = getTargetNumber(m, '');
        } else {
            targetNum = getTargetNumber(m, text);
            if (!quota && parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
                quota = parseInt(parts[parts.length - 1], 10);
            }
        }

        if (!targetNum || targetNum.length < 5 || !quota) {
            return Reply(`\`⌜ Tambah Reseller AM ⌟\`\n> ◦ *Format :* ${command} <nomor/tag> <kuota>\n> ◦ *Contoh :* ${command} 6281234567890 30\n> ◦ *Contoh :* ${command} @user 30`);
        }

        const addedBy = isCreator ? null : senderNum;
        const res = amRoles.addReseller(targetNum, quota, addedBy);
        if (!res.ok) return Reply(`❌ ${res.message}`);
        return Reply(`\`⌜ Sukses Tambah Reseller AM ⌟\`\n> ◦ *Nomor :* ${res.number}\n> ◦ *Kuota :* ${res.quota}\n> ◦ *Ditambahkan oleh :* ${isCreator ? 'Owner' : 'PT AM ' + addedBy}`, [res.number + '@s.whatsapp.net']);
    }
};
