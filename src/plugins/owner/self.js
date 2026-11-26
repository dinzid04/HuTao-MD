module.exports = {
    name: 'self',
    category: 'owner',
    commands: ['self'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Dinz.public = false;
        global.db.settings.isPublic = false;
        Reply(`\`⌜ Mode Settings ⌟\`\n> ◦ Status : *Self*\n> ◦ Info : *Hanya owner yang dapat menggunakan bot*`);
        return true;
    }
};
