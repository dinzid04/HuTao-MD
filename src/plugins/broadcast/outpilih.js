module.exports = {
    name: 'outpilih',
    category: 'broadcast',
    commands: ['outpilih'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply, sendSelectList } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const allGrup = await Dinz.groupFetchAllParticipating();
        const grupArr = Object.values(allGrup);
        if (grupArr.length === 0) return Reply("❌ Bot tidak berada di grup manapun.");

        const rows = grupArr.map((g, idx) => ({
            header: `Grup ${idx + 1}`,
            title: g.subject || g.id,
            description: `ID: ${g.id} | Total Member: ${g.participants?.length || 0}`,
            id: `.outgc ${g.id}`
        }));

        const caption = `\`⌜ Out Pilih Grup ⌟\`\n> ◦ Total : *${grupArr.length} Grup*\n> ◦ Silakan pilih grup yang ingin ditinggalkan dari daftar di bawah.`;

        await sendSelectList({
            title: "Daftar Grup",
            buttonTitle: "Pilih Grup Keluar",
            captionText: caption,
            rows: rows
        });
        return true;
    }
};
