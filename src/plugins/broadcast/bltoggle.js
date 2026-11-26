module.exports = {
    name: 'bltoggle',
    category: 'broadcast',
    commands: ['bltoggle'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const targetJid = args[0] ? (args[0].endsWith('@g.us') ? args[0] : args[0] + '@g.us') : '';
        if (!targetJid) return Reply("❌ JID grup tidak valid.");

        if (!global.db.groups[targetJid]) global.db.groups[targetJid] = {};
        let groupSubject = targetJid;
        try {
            const meta = await Dinz.groupMetadata(targetJid);
            groupSubject = meta.subject || targetJid;
        } catch (e) {}

        if (global.db.groups[targetJid].blacklistjpm) {
            global.db.groups[targetJid].blacklistjpm = false;
            Reply(`\`⌜ Blacklist JPM ⌟\`\n> ◦ Grup : *${groupSubject}*\n> ◦ Status : *🔓 Dihapus dari Blacklist (Aktif)*`);
        } else {
            global.db.groups[targetJid].blacklistjpm = true;
            Reply(`\`⌜ Blacklist JPM ⌟\`\n> ◦ Grup : *${groupSubject}*\n> ◦ Status : *🔒 Ditambahkan ke Blacklist JPM*`);
        }
        return true;
    }
};
