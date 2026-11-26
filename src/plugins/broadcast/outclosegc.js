module.exports = {
    name: 'outclosegc',
    category: 'broadcast',
    commands: ['outclosegc'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const closeGrup = Object.entries(allGrup).filter(([, meta]) => meta.announce);

            if (closeGrup.length === 0) return Reply("❌ Tidak ada grup close untuk ditinggalkan.");

            let count = 0;
            for (let [id] of closeGrup) {
                try {
                    await Dinz.groupLeave(id);
                    count++;
                } catch (e) {}
                await new Promise(r => setTimeout(r, 1500));
            }
            Reply(`\`⌜ Out Close GC ⌟\`\n> ◦ Keluar dari : *${count} Grup Close*`);
        } catch (e) {
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
