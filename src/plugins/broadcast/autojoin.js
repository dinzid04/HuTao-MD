module.exports = {
    name: 'autojoin',
    category: 'broadcast',
    commands: ['autojoin'],

    async execute(ctx) {
        const { args, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const valAj = (args[0] || '').toLowerCase();
        if (valAj !== 'on' && valAj !== 'off') return Reply(example("on/off"));
        global.db.settings.autojoin = valAj === 'on';
        Reply(`\`⌜ Auto Join ⌟\`\n> ◦ Status : *${valAj === 'on' ? '🟢 Aktif' : '🔴 Nonaktif'}*\n> ◦ Info : *Bot akan ${valAj === 'on' ? 'otomatis join' : 'tidak join'} link grup yang dikirim lewat PM*`);
        return true;
    }
};
