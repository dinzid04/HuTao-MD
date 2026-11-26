module.exports = {
    name: 'addreseller',
    category: 'cpanel',
    commands: ['addresellerv1', 'addresellerv2', 'addresellerv3', 'addreseller'],

    async execute(ctx) {
        const {
            m, command, args, text, isCreator, Reply, getTargetNumber, resolveTargetNumber,
            CPANEL
        } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';

        let targetNum = '';
        let days = 30;
        const argStr = text ? text.trim() : '';

        if (m.mentionedJid?.[0] || m.quoted?.sender) {
            targetNum = getTargetNumber(m, '');
            const rawDays = args.find(a => /^\d+$/.test(a));
            if (rawDays) days = parseInt(rawDays, 10);
        } else if (argStr.includes(',')) {
            const parts = argStr.split(',').map(p => p.trim());
            const p1 = parts[0].replace(/[^0-9]/g, '');
            const p2 = parts[1].replace(/[^0-9]/g, '');
            if (p1.length >= 5) {
                targetNum = resolveTargetNumber(p1, m);
                days = parseInt(p2) || 30;
            } else {
                days = parseInt(p1) || 30;
            }
        } else if (argStr) {
            const cleanArg = argStr.replace(/[^0-9]/g, '');
            if (cleanArg.length <= 4 && parseInt(cleanArg) > 0) {
                days = parseInt(cleanArg);
            } else if (cleanArg.length >= 5) {
                targetNum = resolveTargetNumber(cleanArg, m);
            }
        }

        if (!targetNum) {
            targetNum = getTargetNumber(m, '');
        }

        if (!targetNum || targetNum.length < 5) {
            return Reply(`*CARA TAMBAH RESELLER (${serverVersion.toUpperCase()}):*\n\n> \`.${command} @user,hari\`\n> \`.${command} 628xxx,hari\`\n> \`.${command} 30\` (reply user)`);
        }

        const result = CPANEL.addReseller(serverVersion, targetNum, days);
        if (!result) return Reply(`❌ Gagal mendaftarkan reseller.`);

        const targetJid = targetNum + '@s.whatsapp.net';
        return Reply(`\`⌜ Sukses Tambah Reseller ⌟\`\n> ◦ Server : *${serverVersion.toUpperCase()}*\n> ◦ User : @${targetNum}\n> ◦ Durasi : *${result.days} Hari*\n> ◦ Expired : *${result.expiredStr}*\n> ◦ Status : *Aktif*`, [targetJid]);
    }
};
