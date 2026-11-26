module.exports = {
    name: 'autoread',
    category: 'owner',
    commands: ['autoread'],

    async execute(ctx) {
        const { args, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        let value = args[0]?.toLowerCase();
        if (!value || (value !== 'on' && value !== 'off')) {
            return Reply(example("on/off"));
        }
        if (value === 'on') {
            global.db.settings.autoread = true;
            Reply(`\`⌜ Autoread Settings ⌟\`\n> ◦ Status : *Aktif*\n> ◦ Info : *Bot akan otomatis membaca pesan masuk*`);
        } else if (value === 'off') {
            global.db.settings.autoread = false;
            Reply(`\`⌜ Autoread Settings ⌟\`\n> ◦ Status : *Nonaktif*\n> ◦ Info : *Bot tidak akan otomatis membaca pesan masuk*`);
        }
        return true;
    }
};
