module.exports = {
    name: 'delbl_action',
    category: 'broadcast',
    commands: ['delbl_action'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const targetJid = args[0] ? (args[0].endsWith('@g.us') ? args[0] : args[0] + '@g.us') : '';
        if (!targetJid) return Reply("❌ JID grup tidak valid.");

        if (global.db.groups[targetJid]) {
            global.db.groups[targetJid].blacklistjpm = false;
        }
        let groupSubject = targetJid;
        try {
            const meta = await Dinz.groupMetadata(targetJid);
            groupSubject = meta.subject || targetJid;
        } catch (e) {}

        Reply(`\`⌜ Delbl Berhasil ⌟\`\n> ◦ Sukses menghapus : *${groupSubject}* dari Blacklist JPM`);
        return true;
    }
};
