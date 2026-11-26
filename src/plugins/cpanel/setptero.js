module.exports = {
    name: 'setptero',
    category: 'cpanel',
    commands: ['setpterov1', 'setpterov2', 'setpterov3', 'setptero'],

    async execute(ctx) {
        const { command, text, isCreator, Reply, CPANEL } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';
        const res = CPANEL.setServerConfig({ serverVersion, configStr: text, isBotOwner: isCreator });
        return Reply(res.message);
    }
};
