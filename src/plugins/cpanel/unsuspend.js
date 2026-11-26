module.exports = {
    name: 'unsuspend',
    category: 'cpanel',
    commands: ['unsuspendv1', 'unsuspendv2', 'unsuspendv3', 'unsuspend'],

    async execute(ctx) {
        const { m, command, args, text, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        const inputParts = (text || '').split(',').map(s => s.trim());
        const serverId = inputParts[0] || args[0];
        const extendDays = inputParts[1] || args[1] || 30;
        if (!serverId) return Reply(`*Contoh:* .unsuspend${serverVersion} <id_server>,<perpanjang_hari>\n*Contoh:* .unsuspend${serverVersion} 12,30`);
        Reply(global.mess.wait);
        const res = await CPANEL.unsuspendServer({ serverVersion, serverId, extendDays, isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
