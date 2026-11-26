module.exports = {
    name: 'addlimit',
    category: 'owner',
    commands: ['addlimit'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, getTargetNumber, getSenderNumber, addBonusLimit } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const rawTarget = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null) || args[0] || '';
        const targetNum = getTargetNumber(m, rawTarget);
        const target = targetNum ? targetNum + '@s.whatsapp.net' : null;
        let amount = parseInt(args.find(arg => !arg.includes('@') && /^\d+$/.test(arg)));

        if (!target && args[0] && !isNaN(parseInt(args[0]))) {
            amount = parseInt(args[0]);
            const sn = getSenderNumber(m);
            target = sn ? sn + '@s.whatsapp.net' : null;
        }

        if (!target || isNaN(amount) || amount <= 0) {
            return Reply(`📌 *Contoh Penggunaan:*\n> ◦ addlimit @user 20\n> ◦ addlimit 628123456789 20`);
        }

        addBonusLimit(target, amount);
        return Reply(`\`⌜ Bonus Limit Ditambahkan ⌟\`\n> ◦ *Target :* @${targetNum}\n> ◦ *Jumlah :* +${amount} Limit\n> ◦ *Info :* Bonus limit berlaku untuk hari ini`, [target]);
    }
};
