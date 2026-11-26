module.exports = {
    name: 'join',
    category: 'broadcast',
    commands: ['join'],

    async execute(ctx) {
        const { Dinz, text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(example("https://chat.whatsapp.com/xxxxx"));

        const linkJoin = text.trim();
        if (!linkJoin.includes('chat.whatsapp.com/')) return Reply("❌ Link WhatsApp tidak valid.");

        const invCode = linkJoin.split('chat.whatsapp.com/')[1].split(/[\s?]+/)[0].trim();
        try {
            Reply(global.mess.wait);
            const joinRes = await Dinz.groupAcceptInvite(invCode);
            Reply(`\`⌜ Join Grup ⌟\`\n> ◦ Status : *Berhasil Join*\n> ◦ ID Grup : *${joinRes}*`);
        } catch (e) {
            Reply(`❌ Gagal join grup: ${e.message}`);
        }
        return true;
    }
};
