module.exports = {
    name: 'delbl',
    category: 'broadcast',
    commands: ['delbl'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const targetJid = args[0] ? (args[0].endsWith('@g.us') ? args[0] : args[0] + '@g.us') : (m.isGroup ? m.chat : '');
        if (!targetJid) return Reply(example("<jid_grup> (atau ketik di dalam grup)"));

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
