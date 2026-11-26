module.exports = {
    name: 'serverinfo',
    category: 'cpanel',
    commands: [
        'sinfov1', 'sinfov2', 'sinfov3', 'serverinfov1', 'serverinfov2', 'serverinfov3', 'serverinfo'
    ],

    async execute(ctx) {
        const { m, command, args, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        if (!args[0]) return Reply(`*Contoh:* .serverinfo${serverVersion} <id_server>`);
        Reply(global.mess.wait);
        const res = await CPANEL.serverInfo({ serverVersion, serverId: args[0], isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
