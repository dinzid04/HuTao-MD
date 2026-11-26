module.exports = {
    name: 'stopjoin',
    category: 'broadcast',
    commands: ['stopjoin'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        global.db.settings.autojoin = false;
        Reply(`\`⌜ Auto Join ⌟\`\n> ◦ Status : *🔴 Dihentikan*`);
        return true;
    }
};
