module.exports = {
    name: 'suspend',
    category: 'cpanel',
    commands: ['suspendv1', 'suspendv2', 'suspendv3', 'suspend'],

    async execute(ctx) {
        const { m, command, args, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';

        if (!args[0]) return Reply(`*Contoh:* .suspend${serverVersion} <id_server>`);
        Reply(global.mess.wait);
        const res = await CPANEL.suspendServer({ serverVersion, serverId: args[0], isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
