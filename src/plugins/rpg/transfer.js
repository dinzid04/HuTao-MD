module.exports = {
    name: 'transfer',
    category: 'rpg',
    commands: ['transfer', 'tf'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, HITORI_RPG } = ctx;

        const type = (args[0] || '').toLowerCase();
        const amount = args[1];
        const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (!targetJid || !amount) {
            return Reply(`📌 *Format Transfer:* transfer [tipe] [jumlah] @user\nContoh: *transfer money 5000 @user* atau *transfer diamond 2 @user*`);
        }
        const senderUser = global.db.users[m.sender] || (global.db.users[m.sender] = {});
        const receiverUser = global.db.users[targetJid] || (global.db.users[targetJid] = {});
        const receiverName = await Dinz.getName(targetJid) || 'User';
        const res = HITORI_RPG.transfer(senderUser, receiverUser, type, amount, receiverName);
        await Dinz.sendMessage(m.chat, { react: { text: res.success ? '💸' : '❌', key: m.key } }).catch(() => {});
        return Reply(res.message, [targetJid]);
    }
};
