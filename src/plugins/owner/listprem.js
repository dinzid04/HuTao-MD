module.exports = {
    name: 'listprem',
    category: 'owner',
    commands: ['listprem', 'premlist'],

    async execute(ctx) {
        const { isCreator, Reply, getPremiumList } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const list = getPremiumList();
        if (list.length === 0) {
            return Reply(`\`⌜ Daftar User Premium ⌟\`\n> ◦ Belum ada pengguna premium terdaftar.`);
        }

        let listTxt = list.map((u, i) => `> *${i + 1}.* @${u.id}\n> ◦ *Sisa Waktu :* ${u.remaining}`).join('\n\n');
        const mentions = list.map(u => u.id + '@s.whatsapp.net');

        return Reply(`\`⌜ Daftar User Premium (${list.length}) ⌟\`\n\n${listTxt}`, mentions);
    }
};
