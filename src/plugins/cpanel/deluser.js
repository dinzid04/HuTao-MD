module.exports = {
    name: 'deluser',
    category: 'cpanel',
    commands: ['deluserv1', 'deluserv2', 'deluserv3', 'deluser'],

    async execute(ctx) {
        const { m, command, args, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        if (!args[0]) return Reply(`*Contoh:* .deluser${serverVersion} <id_user>`);
        Reply(global.mess.wait);
        const res = await CPANEL.deleteUser({ serverVersion, userId: args[0], isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
