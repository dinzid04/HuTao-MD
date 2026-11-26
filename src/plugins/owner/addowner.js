module.exports = {
    name: 'addowner',
    category: 'owner',
    commands: ['addowner'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, getTargetNumber, botCtx, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const newNum = getTargetNumber(m, text);
        if (!newNum || newNum.length < 5) return Reply(example("@tag / reply / nomor"));

        if (Dinz.isJadibot) {
            const res = jadibotMgr.addJadibotOwner(Dinz.jadibotNumber, newNum);
            if (!res.ok) return Reply(`❌ ${res.message}`);
            return Reply(`\`⌜ Add Owner ⌟\`\n> ◦ Nomor : *${newNum}*\n> ◦ Status : *Berhasil Ditambahkan ke owner jadibot*`, [newNum + '@s.whatsapp.net']);
        }

        const rawOwners = botCtx.getMainSection('owner');
        const owners = Array.isArray(rawOwners) ? [...rawOwners] : [];

        if (owners.includes(newNum)) return Reply(`❌ Nomor *${newNum}* sudah terdaftar sebagai owner.`);

        owners.push(newNum);
        botCtx.setMainSection('owner', owners);
        Reply(`\`⌜ Add Owner ⌟\`\n> ◦ Nomor : *${newNum}*\n> ◦ Status : *Berhasil Ditambahkan*`, [newNum + '@s.whatsapp.net']);
        return true;
    }
};
