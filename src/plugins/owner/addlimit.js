module.exports = {
    name: 'addlimit',
    category: 'owner',
    commands: ['addlimit'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, getTargetNumber, getSenderNumber, addBonusLimit } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const mentioned = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        let targetNum = '';
        let amount = NaN;

        if (mentioned) {
            targetNum = getTargetNumber(m, mentioned);
            const numArg = args.find((a) => !a.includes('@') && /^\d+$/.test(a));
            amount = numArg ? parseInt(numArg, 10) : NaN;
        } else if (args.length >= 2) {
            targetNum = getTargetNumber(m, args[0]);
            amount = parseInt(String(args[1] || '').replace(/[^0-9]/g, ''), 10);
        } else if (args.length === 1 && /^\d+$/.test(args[0])) {
            amount = parseInt(args[0], 10);
            targetNum = getSenderNumber(m);
        }

        const target = targetNum ? targetNum + '@s.whatsapp.net' : null;

        if (!target || isNaN(amount) || amount <= 0) {
            return Reply(`📌 *Contoh Penggunaan:*\n> ◦ addlimit @user 20\n> ◦ addlimit 628123456789 20\n> ◦ addlimit 20 *(untuk diri sendiri)*`);
        }

        addBonusLimit(target, amount);
        return Reply(`\`⌜ Bonus Limit Ditambahkan ⌟\`\n> ◦ *Target :* @${targetNum}\n> ◦ *Jumlah :* +${amount} Limit\n> ◦ *Info :* Bonus limit berlaku untuk hari ini`, [target]);
    }
};
