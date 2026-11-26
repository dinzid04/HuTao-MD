module.exports = {
    name: 'blpilih',
    category: 'broadcast',
    commands: ['blpilih'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply, sendSelectList } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const allGrup = await Dinz.groupFetchAllParticipating();
        const grupArrBl = Object.values(allGrup);
        if (grupArrBl.length === 0) return Reply("❌ Bot tidak berada di grup manapun.");

        const rows = grupArrBl.map((g, idx) => {
            const isBl = Boolean(global.db.groups[g.id]?.blacklistjpm);
            return {
                header: `Grup ${idx + 1}`,
                title: g.subject || g.id,
                description: `Status: ${isBl ? '🔒 Blacklist' : '🟢 Aktif'} | ID: ${g.id}`,
                id: `.bltoggle ${g.id}`
            };
        });

        const caption = `\`⌜ Blacklist Pilih Grup ⌟\`\n> ◦ Total : *${grupArrBl.length} Grup*\n> ◦ Klik grup di bawah untuk On/Off status Blacklist JPM.`;

        await sendSelectList({
            title: "Daftar Grup",
            buttonTitle: "Toggle Blacklist",
            captionText: caption,
            rows: rows
        });
        return true;
    }
};
