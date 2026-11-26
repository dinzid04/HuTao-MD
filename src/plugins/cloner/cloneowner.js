const { formatCard, toMono, normalizeWaNumber, requireClonerOwner, patchCloneConfig } = require('./_helper');

module.exports = {
    name: 'cloneowner',
    category: 'cloner',
    commands: ['cloneowner', 'clonenoowner', 'clonesetowner'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, text, Reply, example, getTargetNumber, botCtx, jadibotMgr } = ctx;

        const rawTarget = getTargetNumber(m, text);
        const newOwner = normalizeWaNumber(rawTarget || text);
        if (!newOwner || newOwner.length < 8 || newOwner.length > 16) {
            return Reply(example('6281234567890 (atau tag/reply nomor)'));
        }

        const prevId = botCtx.getJadibotIdentity(cloneNum);
        const existingOwners = jadibotMgr.getJadibotOwners ? jadibotMgr.getJadibotOwners(cloneNum) : [];
        const mergedOwners = [...new Set([cloneNum, newOwner, ...existingOwners].filter(Boolean))];

        const updated = patchCloneConfig(cloneNum, { owner: newOwner, owners: mergedOwners }, botCtx, jadibotMgr);
        try { botCtx.setSection('owner', mergedOwners, cloneNum); } catch (_) {}
        Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), owner: updated.owner };

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '👑',
            title: 'NOMOR OWNER CLONE DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: toMono(prevId.owner) },
                { label: 'Baru', value: toMono(updated.owner) },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }), [`${newOwner}@s.whatsapp.net`]);
    }
};
