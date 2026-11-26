module.exports = {
    name: 'setdelaypushkontak',
    category: 'broadcast',
    commands: ['setdelaypushkontak'],

    async execute(ctx) {
        const { text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const dPush = parseInt(text);
        if (isNaN(dPush) || dPush < 500) return Reply(example("<ms> (min 500)\nContoh: setdelaypushkontak 2000"));
        global.db.settings.delayPushKontak = dPush;
        Reply(`\`⌜ Delay Push Kontak ⌟\`\n> ◦ Delay : *${dPush}ms*\n> ◦ Status : *Berhasil Diubah*`);
        return true;
    }
};
