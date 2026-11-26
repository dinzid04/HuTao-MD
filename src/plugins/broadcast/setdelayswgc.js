module.exports = {
    name: 'setdelayswgc',
    category: 'broadcast',
    commands: ['setdelayswgc', 'setdelayautoswgc'],

    async execute(ctx) {
        const { text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const dSwgc = parseInt(text);
        if (isNaN(dSwgc) || dSwgc < 1000) return Reply(example("<ms> (min 1000)\nContoh: setdelayswgc 60000"));
        global.db.settings.delayAutoSwgc = dSwgc;
        Reply(`\`⌜ Delay SWGC ⌟\`\n> ◦ Delay : *${dSwgc}ms*\n> ◦ Status : *Berhasil Diubah*`);
        return true;
    }
};
