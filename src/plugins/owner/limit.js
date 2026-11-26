module.exports = {
    name: 'limit',
    category: 'owner',
    commands: ['limit', 'ceklimit'],

    async execute(ctx) {
        const { m, botNumber, isCreator, Reply, getUserLimitInfo } = ctx;

        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : m.sender);
        const isTargetOwner = isCreator || targetJid === botNumber || targetJid === global.owner + '@s.whatsapp.net';
        const info = getUserLimitInfo(targetJid, isTargetOwner);

        if (info.isOwner) {
            return Reply(`\`⌜ Info Limit User ⌟\`
> ◦ *User :* @${targetJid.split('@')[0]}
> ◦ *Status :* *Owner*
> ◦ *Limit :* *∞ Unlimited*
> ◦ *Progress :* [${info.progressBar}]`, [targetJid]);
        }

        return Reply(`\`⌜ Info Limit User ⌟\`
> ◦ *User :* @${targetJid.split('@')[0]}
> ◦ *Status :* *User*
> ◦ *Limit Terpakai :* *${info.userUsage} / ${info.maxLimit}*
> ◦ *Sisa Limit :* *${info.remaining}*
> ◦ *Progress :* [${info.progressBar}]
> ◦ *Claim Hari Ini :* *${info.claimStatus}*

💡 *Catatan:*
> ◦ Limit di-reset setiap jam 00:00 WIB
> ◦ Ketik *claim* untuk mendapatkan bonus +5 limit gratis hari ini`, [targetJid]);
    }
};
