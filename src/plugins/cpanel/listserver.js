module.exports = {
    name: 'listserver',
    category: 'cpanel',
    commands: ['listserverv1', 'listserverv2', 'listserverv3', 'listserver'],

    async execute(ctx) {
        const { m, command, isCreator, Reply, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        Reply(global.mess.wait);
        const res = await CPANEL.listServers({ serverVersion, isBotOwner: isCreator, senderJid: m.sender });
        return Reply(res.message);
    }
};
