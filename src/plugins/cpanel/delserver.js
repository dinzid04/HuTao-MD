module.exports = {
    name: 'delserver',
    category: 'cpanel',
    commands: ['delserverv1', 'delserverv2', 'delserverv3', 'delserver'],

    async execute(ctx) {
        const { m, command, args, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        if (!args[0]) return Reply(`*Contoh:* .delserver${serverVersion} <id_server>`);
        Reply(global.mess.wait);
        const res = await CPANEL.deleteServer({ serverVersion, serverId: args[0], isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
