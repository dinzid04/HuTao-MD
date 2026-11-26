module.exports = {
    name: 'setdelayjpm',
    category: 'broadcast',
    commands: ['setdelayjpm'],

    async execute(ctx) {
        const { text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const delayVal = parseInt(text);
        if (isNaN(delayVal) || delayVal < 500) return Reply(example("<ms> (min 500)\nContoh: setdelayjpm 3000"));
        global.db.settings.delayJpm = delayVal;
        Reply(`\`⌜ Delay JPM ⌟\`\n> ◦ Delay : *${delayVal}ms*\n> ◦ Status : *Berhasil Diubah*`);
        return true;
    }
};
