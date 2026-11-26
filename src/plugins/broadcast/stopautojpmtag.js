module.exports = {
    name: 'stopautojpmtag',
    category: 'broadcast',
    commands: ['stopautojpmtag'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!global._autoJpmTagInterval) return Reply("❌ Auto JPM Tag tidak sedang berjalan.");
        clearInterval(global._autoJpmTagInterval);
        global._autoJpmTagInterval = null;
        Reply(`\`⌜ Auto JPM Tag ⌟\`\n> ◦ Status : *Dihentikan*`);
        return true;
    }
};
