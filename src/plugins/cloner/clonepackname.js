const { formatCard, requireClonerOwner, patchCloneConfig } = require('./_helper');

module.exports = {
    name: 'clonepackname',
    category: 'cloner',
    commands: ['clonepackname', 'clonepack', 'clonewm'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, text, Reply, example, botCtx, jadibotMgr } = ctx;

        const newPack = (text || '').trim();
        if (!newPack) return Reply(example('MyClone Sticker'));
        if (newPack.length > 60) return Reply('❌ Packname clone maksimal 60 karakter.');

        const oldPack = botCtx.getJadibotIdentity(cloneNum).packname;
        const updated = patchCloneConfig(cloneNum, { packname: newPack }, botCtx, jadibotMgr);
        Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), packname: updated.packname };

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🖼️',
            title: 'PACKNAME STIKER CLONE DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldPack },
                { label: 'Baru', value: updated.packname },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
