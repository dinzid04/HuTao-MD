module.exports = {
    name: 'listptam',
    category: 'am',
    commands: ['listptam', 'ptamlist'],

    async execute(ctx) {
        const { isCreator, Reply, amRoles } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const list = amRoles.listPt();
        if (list.length === 0) {
            return Reply(`\`⌜ Daftar PT AM ⌟\`\n> ◦ Belum ada PT AM terdaftar.`);
        }

        const listTxt = list.map((p, i) => `> *${i + 1}.* @${p.id}`).join('\n');
        const mentions = list.map(p => p.id + '@s.whatsapp.net');
        return Reply(`\`⌜ Daftar PT AM (${list.length}) ⌟\`\n\n${listTxt}`, mentions);
    }
};
