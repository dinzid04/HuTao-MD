module.exports = {
    name: 'listowner',
    category: 'owner',
    commands: ['listowner'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply, botCtx, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        let owners = [];
        if (Dinz.isJadibot) {
            owners = jadibotMgr.getJadibotOwners(Dinz.jadibotNumber) || [];
        } else {
            const rawOwners = botCtx.getMainSection('owner');
            owners = Array.isArray(rawOwners) ? rawOwners : [];
        }

        const scope = Dinz.isJadibot ? 'Owner Jadibot' : 'List Owner';
        if (owners.length === 0) return Reply(`\`⌜ ${scope} ⌟\`\n> ◦ Status : *Kosong*`);
        const list = owners.map((v, i) => `> ◦ ${i+1}. ${v}`).join('\n');
        Reply(`\`⌜ ${scope} ⌟\`\n> ◦ Total : *${owners.length} Nomor*\n${list}`);
        return true;
    }
};
