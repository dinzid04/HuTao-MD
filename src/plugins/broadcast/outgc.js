module.exports = {
    name: 'outgc',
    category: 'broadcast',
    commands: ['outgc'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const targetJid = args[0] ? (args[0].endsWith('@g.us') ? args[0] : args[0] + '@g.us') : '';
        if (!targetJid) return Reply("❌ JID grup tidak valid.");

        let groupSubject = targetJid;
        try {
            const meta = await Dinz.groupMetadata(targetJid);
            groupSubject = meta.subject || targetJid;
        } catch (e) {}

        try {
            await Dinz.groupLeave(targetJid);
            Reply(`\`⌜ Out Grup Berhasil ⌟\`\n> ◦ Sukses keluar dari : *${groupSubject}*\n> ◦ JID : \`${targetJid}\``);
        } catch (e) {
            Reply(`❌ Gagal keluar dari grup ${groupSubject}: ${e.message}`);
        }
        return true;
    }
};
