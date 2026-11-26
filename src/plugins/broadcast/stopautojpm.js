module.exports = {
    name: 'stopautojpm',
    category: 'broadcast',
    commands: ['stopautojpm'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!global._autoJpmInterval) return Reply("❌ Auto JPM tidak sedang berjalan.");
        clearInterval(global._autoJpmInterval);
        global._autoJpmInterval = null;
        Reply(`\`⌜ Auto JPM ⌟\`\n> ◦ Status : *Dihentikan*`);
        return true;
    }
};
