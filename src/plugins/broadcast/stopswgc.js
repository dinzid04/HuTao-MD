module.exports = {
    name: 'stopswgc',
    category: 'broadcast',
    commands: ['stopswgc', 'stopautoswgc'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!global._autoSwgcInterval) return Reply("❌ Auto SWGC tidak sedang berjalan.");
        clearInterval(global._autoSwgcInterval);
        global._autoSwgcInterval = null;
        Reply(`\`⌜ Auto SWGC ⌟\`\n> ◦ Status : *Dihentikan*`);
        return true;
    }
};
