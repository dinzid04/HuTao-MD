module.exports = {
    name: 'public',
    category: 'owner',
    commands: ['public'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Dinz.public = true;
        global.db.settings.isPublic = true;
        Reply(`\`⌜ Mode Settings ⌟\`\n> ◦ Status : *Public*\n> ◦ Info : *Semua orang dapat menggunakan bot*`);
        return true;
    }
};
