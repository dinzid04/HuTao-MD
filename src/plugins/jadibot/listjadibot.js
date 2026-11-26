module.exports = {
    name: 'listjadibot',
    category: 'jadibot',
    commands: ['listjadibot', 'listjbot'],

    async execute(ctx) {
        const { m, isCreator, Reply, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!jadibotMgr.claimCommandExecution(m.key.id)) return;
        const res = jadibotMgr.listJadibot();
        Reply(res.message);
        return true;
    }
};
