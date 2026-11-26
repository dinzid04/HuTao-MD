const { formatCard, requireClonerOwner, patchCloneConfig } = require('./_helper');

module.exports = {
    name: 'clonenamaowner',
    category: 'cloner',
    commands: ['clonenamaowner', 'cloneownername'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, text, Reply, example, botCtx, jadibotMgr } = ctx;

        const newName = (text || '').trim();
        if (!newName) return Reply(example('Nama Owner Kamu'));
        if (newName.length > 60) return Reply('❌ Nama owner clone maksimal 60 karakter.');

        const oldName = botCtx.getJadibotIdentity(cloneNum).namaOwner;
        const updated = patchCloneConfig(cloneNum, { namaOwner: newName }, botCtx, jadibotMgr);
        Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), namaOwner: updated.namaOwner };

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🪪',
            title: 'NAMA OWNER CLONE DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldName },
                { label: 'Baru', value: updated.namaOwner },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
