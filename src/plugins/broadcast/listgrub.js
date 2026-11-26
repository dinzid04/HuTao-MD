module.exports = {
    name: 'listgrub',
    category: 'broadcast',
    commands: ['listgrub', 'listgrup', 'listgc'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const grupArr = Object.entries(allGrup);

            if (grupArr.length === 0) return Reply("❌ Bot tidak berada di grup manapun.");

            let teks = `\`⌜ List Semua Grup ⌟\`\n> ◦ Total : *${grupArr.length} Grup*\n\n`;
            grupArr.forEach(([id, meta], i) => {
                const isClose = meta.announce ? '🔒' : '🔓';
                const memberCount = (meta.participants || []).length;
                const bl = global.db.groups[id]?.blacklistjpm ? ' [BL]' : '';
                teks += `*${i+1}.* ${meta.subject || id}${bl}\n> ◦ ${isClose} ${meta.announce ? 'Close' : 'Open'} | 👥 ${memberCount}\n\n`;
            });

            Reply(teks);
        } catch (e) {
            Reply(`❌ Gagal mengambil daftar grup: ${e.message}`);
        }
        return true;
    }
};
