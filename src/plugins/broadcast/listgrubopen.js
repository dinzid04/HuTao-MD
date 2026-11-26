module.exports = {
    name: 'listgrubopen',
    category: 'broadcast',
    commands: ['listgrubopen', 'listgrupopen', 'listgcopen'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const openGrup = Object.entries(allGrup).filter(([, meta]) => !meta.announce);

            if (openGrup.length === 0) return Reply("❌ Tidak ada grup yang berstatus open.");

            let teks = `\`⌜ List Grup Open ⌟\`\n> ◦ Total : *${openGrup.length} Grup*\n\n`;
            openGrup.forEach(([id, meta], i) => {
                const memberCount = (meta.participants || []).length;
                teks += `*${i+1}.* ${meta.subject || id}\n> ◦ 🔓 Open | 👥 ${memberCount}\n\n`;
            });
            Reply(teks);
        } catch (e) {
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
