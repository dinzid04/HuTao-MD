module.exports = {
    name: 'outopengc',
    category: 'broadcast',
    commands: ['outopengc'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const openGrup = Object.entries(allGrup).filter(([, meta]) => !meta.announce);

            if (openGrup.length === 0) return Reply("❌ Tidak ada grup open untuk ditinggalkan.");

            let count = 0;
            for (let [id] of openGrup) {
                try {
                    await Dinz.groupLeave(id);
                    count++;
                } catch (e) {}
                await new Promise(r => setTimeout(r, 1500));
            }
            Reply(`\`⌜ Out Open GC ⌟\`\n> ◦ Keluar dari : *${count} Grup Open*`);
        } catch (e) {
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
