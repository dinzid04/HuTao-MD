module.exports = {
    name: 'jpmpilih',
    category: 'broadcast',
    commands: ['jpmpilih'],

    async execute(ctx) {
        const { Dinz, m, text, mime, qmsg, isCreator, Reply, sendSelectList } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const allGrup = await Dinz.groupFetchAllParticipating();
        const grupArr = Object.values(allGrup);
        if (grupArr.length === 0) return Reply("❌ Bot tidak berada di grup manapun.");

        const isMedia = /image|video/.test(mime);
        const teks = text || '';
        let mediaBuf = null;
        if (isMedia && qmsg.download) {
            mediaBuf = await qmsg.download();
        }

        if (!global._jpmPilihBroadcast) global._jpmPilihBroadcast = {};
        global._jpmPilihBroadcast[m.sender] = {
            text: teks,
            mediaBuf,
            mime
        };

        const rows = grupArr.map((g, idx) => ({
            header: `Grup ${idx + 1}`,
            title: g.subject || g.id,
            description: `ID: ${g.id} | Member: ${g.participants?.length || 0}`,
            id: `.jpmto ${g.id}`
        }));

        const caption = `\`⌜ JPM Pilih Grup ⌟\`\n> ◦ Total : *${grupArr.length} Grup*\n> ◦ Silakan pilih grup target broadcast JPM dari daftar di bawah.`;

        await sendSelectList({
            title: "Daftar Grup JPM",
            buttonTitle: "Pilih Target JPM",
            captionText: caption,
            rows: rows
        });
        return true;
    }
};
