module.exports = {
    name: 'listgrubclose',
    category: 'broadcast',
    commands: ['listgrubclose', 'listgrupclose', 'listgcclose'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const closeGrup = Object.entries(allGrup).filter(([, meta]) => meta.announce);

            if (closeGrup.length === 0) return Reply("❌ Tidak ada grup yang berstatus close.");

            let teks = `\`⌜ List Grup Close ⌟\`\n> ◦ Total : *${closeGrup.length} Grup*\n\n`;
            closeGrup.forEach(([id, meta], i) => {
                const memberCount = (meta.participants || []).length;
                teks += `*${i+1}.* ${meta.subject || id}\n> ◦ 🔒 Close | 👥 ${memberCount}\n\n`;
            });
            Reply(teks);
        } catch (e) {
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
