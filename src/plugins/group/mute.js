module.exports = {
    name: 'mute',
    category: 'group',
    commands: ['mute'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, example } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        let value = args[0]?.toLowerCase();
        if (!value || (value !== 'on' && value !== 'off')) {
            return Reply(example("on/off"));
        }
        if (value === 'on') {
            global.db.groups[m.chat].mute = true;
            Reply(`\`⌜ Mute Settings ⌟\`\n> ◦ Status : *Aktif*\n> ◦ Info : *Bot berhasil di-mute di grup ini*`);
        } else if (value === 'off') {
            global.db.groups[m.chat].mute = false;
            Reply(`\`⌜ Mute Settings ⌟\`\n> ◦ Status : *Nonaktif*\n> ◦ Info : *Bot berhasil di-unmute di grup ini*`);
        }
        return true;
    }
};
