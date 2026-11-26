module.exports = {
    name: 'delowner',
    category: 'owner',
    commands: ['delowner'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, getTargetNumber, botCtx, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const delNum = getTargetNumber(m, text);
        if (!delNum || delNum.length < 5) return Reply(example("@tag / reply / nomor"));

        if (Dinz.isJadibot) {
            const res = jadibotMgr.delJadibotOwner(Dinz.jadibotNumber, delNum);
            if (!res.ok) return Reply(`❌ ${res.message}`);
            return Reply(`\`⌜ Del Owner ⌟\`\n> ◦ Nomor : *${delNum}*\n> ◦ Status : *Berhasil Dihapus dari owner jadibot*`, [delNum + '@s.whatsapp.net']);
        }

        const rawOwners = botCtx.getMainSection('owner');
        let owners = Array.isArray(rawOwners) ? [...rawOwners] : [];

        if (!owners.includes(delNum)) return Reply(`❌ Nomor *${delNum}* tidak ditemukan dalam daftar owner.`);

        owners = owners.filter(v => v !== delNum);
        botCtx.setMainSection('owner', owners);
        Reply(`\`⌜ Del Owner ⌟\`\n> ◦ Nomor : *${delNum}*\n> ◦ Status : *Berhasil Dihapus*`, [delNum + '@s.whatsapp.net']);
        return true;
    }
};
