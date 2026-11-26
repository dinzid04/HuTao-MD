module.exports = {
    name: 'listsewa',
    category: 'group',
    commands: ['listsewa'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply, botCtx } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        let sewagrup = Array.isArray(botCtx.getSection('sewagrup', Dinz)) ? [...botCtx.getSection('sewagrup', Dinz)] : [];
        const now = Date.now();

        const activeSewa = sewagrup.filter(v => now <= v.expired);

        if (activeSewa.length === 0) {
            return Reply(`\`⌜ Daftar Sewa ⌟\`\n> ◦ Status : *Kosong*\n> ◦ Info : *Belum ada grup yang menyewa bot*`);
        }

        let teks = `\`⌜ Daftar Sewa Bot ⌟\`\n> ◦ Total : *${activeSewa.length} Grup Aktif*\n\n`;

        for (let i = 0; i < activeSewa.length; i++) {
            const data = activeSewa[i];
            let groupName = data.jid;
            try {
                const meta = await Dinz.groupMetadata(data.jid);
                groupName = meta.subject || data.jid;
            } catch (e) {}

            const sisaMs = data.expired - now;
            const days = Math.floor(sisaMs / (24 * 60 * 60 * 1000));
            const hours = Math.floor((sisaMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

            const expiredFormat = new Date(data.expired).toLocaleDateString('id-ID', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            teks += `*${i+1}.* ${groupName}\n> ◦ Expired : *${expiredFormat}* (${days}h ${hours}j)\n\n`;
        }

        Reply(teks);
        return true;
    }
};
