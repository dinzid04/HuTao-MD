module.exports = {
    name: 'outallgc',
    category: 'broadcast',
    commands: ['outallgc'],

    async execute(ctx) {
        const { Dinz, text, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text || text.toLowerCase() !== 'konfirmasi') return Reply(`⚠️ Perintah ini akan mengeluarkan bot dari *semua grup*!\n\nKetik: *outallgc konfirmasi* untuk melanjutkan.`);
        Reply(global.mess.wait);

        try {
            const allGrup = await Dinz.groupFetchAllParticipating();
            const grupIds = Object.keys(allGrup);

            if (grupIds.length === 0) return Reply("❌ Bot tidak berada di grup manapun.");

            let count = 0;
            for (let id of grupIds) {
                try {
                    await Dinz.groupLeave(id);
                    count++;
                } catch (e) {}
                await new Promise(r => setTimeout(r, 1500));
            }
            Reply(`\`⌜ Out All GC ⌟\`\n> ◦ Berhasil keluar dari : *${count} Grup*`);
        } catch (e) {
            Reply(`❌ Gagal: ${e.message}`);
        }
        return true;
    }
};
