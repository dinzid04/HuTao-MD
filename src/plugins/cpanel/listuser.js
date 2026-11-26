module.exports = {
    name: 'listuser',
    category: 'cpanel',
    commands: ['listuserv1', 'listuserv2', 'listuserv3', 'listuser'],

    async execute(ctx) {
        const { m, command, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        Reply(global.mess.wait);
        const res = await CPANEL.listUsers({ serverVersion, isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
