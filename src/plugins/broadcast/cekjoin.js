module.exports = {
    name: 'cekjoin',
    category: 'broadcast',
    commands: ['cekjoin'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const statusAj = global.db.settings.autojoin ? '🟢 Aktif' : '🔴 Nonaktif';
        Reply(`\`⌜ Status Auto Join ⌟\`\n> ◦ Auto Join : *${statusAj}*`);
        return true;
    }
};
