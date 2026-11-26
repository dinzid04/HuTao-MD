module.exports = {
    name: 'createserver',
    category: 'cpanel',
    commands: [
        '1gbv1', '1gbv2', '1gbv3', '1gb', '2gbv1', '2gbv2', '2gbv3', '2gb',
        '3gbv1', '3gbv2', '3gbv3', '3gb', '4gbv1', '4gbv2', '4gbv3', '4gb',
        '5gbv1', '5gbv2', '5gbv3', '5gb', '6gbv1', '6gbv2', '6gbv3', '6gb',
        '7gbv1', '7gbv2', '7gbv3', '7gb', '8gbv1', '8gbv2', '8gbv3', '8gb',
        '9gbv1', '9gbv2', '9gbv3', '9gb', '10gbv1', '10gbv2', '10gbv3', '10gb',
        'unliv1', 'unliv2', 'unliv3', 'unli'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        const ramKey = command.replace(/v[1-3]$/i, '').toLowerCase();
        const inputParts = (text || '').split(',').map(s => s.trim());
        const username = inputParts[0];
        let targetNum = inputParts[1] ? inputParts[1].replace(/[^0-9]/g, '') : '';
        if (!targetNum && (m.mentionedJid?.[0] || m.quoted?.sender)) {
            targetNum = (m.mentionedJid?.[0] || m.quoted.sender).replace(/[^0-9]/g, '');
        }
        const days = inputParts[2] || 30;
        const emailTo = inputParts[3] || '';

        if (!username || !targetNum) {
            return Reply(`*Format :* .${command} username,nomor,hari(opsional),email(opsional)\n*Contoh :* .${command} user1,62812345678,30`);
        }

        Reply(global.mess.wait);
        const res = await CPANEL.createServer({
            serverVersion,
            ramKey,
            username,
            targetNum,
            days,
            emailTo,
            isBotOwner: isCreator,
            senderJid: m.sender
        });

        if (!res.success) return Reply(res.message);

        const targetJid = targetNum + '@s.whatsapp.net';
        const teksAcc = `\`⌜ Sukses Buat Server [${res.serverVersion.toUpperCase()}] ⌟\`\n> ◦ Domain : *${res.domain}*\n> ◦ Server ID : *#${res.serverId}*\n> ◦ Username : *${res.username}*\n> ◦ Password : *${res.password}*\n> ◦ RAM : *${res.ramLabel}*\n> ◦ Masa Aktif : *${res.days} Hari*\n> ◦ Expired : *${res.expiredStr} WIB*\n\n> ◦ *Catatan :* ${res.detailText}`;
        await Reply(teksAcc, [targetJid]);
        if (targetJid !== m.sender) {
            await Dinz.sendMessage(targetJid, { text: teksAcc }).catch(() => {});
        }
        return true;
    }
};
