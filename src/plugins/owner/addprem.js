module.exports = {
    name: 'addprem',
    category: 'owner',
    commands: ['addprem', 'tambahprem'],

    async execute(ctx) {
        const {
            m, command, args, isCreator, Reply, getTargetNumber, resolveTargetNumber,
            addPremiumUser, formatRemainingTime
        } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        let targetNum = '';
        let days = 30;

        if (m.mentionedJid?.[0] || m.quoted?.sender) {
            targetNum = getTargetNumber(m, '');
            const rawDays = args.find(a => /^\d+$/.test(a));
            if (rawDays) days = parseInt(rawDays, 10);
        } else if (args[0]) {
            const rawNum = args[0].replace(/[^0-9]/g, '');
            if (rawNum.length >= 6) {
                targetNum = resolveTargetNumber(rawNum, m);
                if (args[1] && /^\d+$/.test(args[1])) {
                    days = parseInt(args[1], 10);
                }
            } else if (/^\d+$/.test(args[0])) {
                days = parseInt(args[0], 10);
            }
        }

        if (!targetNum || targetNum.length < 5) {
            return Reply(`\`⌜ Tambah User Premium ⌟\`\n> ◦ *Format :* ${command} <nomor/tag> <hari>\n> ◦ *Contoh 1 :* ${command} ${global.owner} 30\n> ◦ *Contoh 2 :* ${command} @user 30\n> ◦ *Contoh 3 :* reply chat user dengan ketik ${command} 30`);
        }

        const result = addPremiumUser(targetNum, days);
        if (!result) return Reply("❌ Gagal menambahkan user premium.");

        const targetJid = targetNum + '@s.whatsapp.net';
        return Reply(
            `\`⌜ Sukses Tambah Premium ⌟\`\n> ◦ *User :* @${targetNum}\n> ◦ *Durasi :* ${days} Hari\n> ◦ *Masa Aktif :* ${formatRemainingTime(result.expired)}\n> ◦ *Status :* Akses fitur VIP aktif ✓`,
            [targetJid]
        );
    }
};
