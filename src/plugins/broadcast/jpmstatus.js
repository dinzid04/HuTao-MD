module.exports = {
    name: 'jpmstatus',
    category: 'broadcast',
    commands: ['jpmstatus'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const allGrup = await Dinz.groupFetchAllParticipating();
        const totalGrup = Object.keys(allGrup).length;
        const blCount = Object.keys(global.db.groups || {}).filter(k => global.db.groups[k]?.blacklistjpm).length;
        const delayJpm = global.db.settings.delayJpm || 3000;
        const delayPush = global.db.settings.delayPushKontak || 3000;
        const autojoinStatus = global.db.settings.autojoin ? '🟢 Aktif' : '🔴 Nonaktif';
        const autoJpmStatus = global._autoJpmInterval ? '🟢 Berjalan' : '🔴 Nonaktif';

        let txt = `\`⌜ Status JPM & Broadcast ⌟\`\n\n`;
        txt += `> ◦ Total Grup : *${totalGrup}*\n`;
        txt += `> ◦ Blacklist JPM : *${blCount} Grup*\n`;
        txt += `> ◦ Delay JPM : *${delayJpm}ms*\n`;
        txt += `> ◦ Delay Push : *${delayPush}ms*\n`;
        txt += `> ◦ Auto Join : *${autojoinStatus}*\n`;
        txt += `> ◦ Auto JPM : *${autoJpmStatus}*`;
        return Reply(txt);
    }
};
