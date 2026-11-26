module.exports = {
    name: 'setdelayjpmtag',
    category: 'broadcast',
    commands: ['setdelayjpmtag'],

    async execute(ctx) {
        const { text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const delayTagVal = parseInt(text);
        if (isNaN(delayTagVal) || delayTagVal < 500) return Reply(example("<ms> (min 500)\nContoh: setdelayjpmtag 3000"));
        global.db.settings.delayJpmTag = delayTagVal;
        Reply(`\`⌜ Delay JPM Tag ⌟\`\n> ◦ Delay : *${delayTagVal}ms*\n> ◦ Status : *Berhasil Diubah*`);
        return true;
    }
};
