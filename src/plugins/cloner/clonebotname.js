const { formatCard, requireClonerOwner, patchCloneConfig } = require('./_helper');

module.exports = {
    name: 'clonebotname',
    category: 'cloner',
    commands: ['clonebotname', 'clonenamabot', 'renameclone'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, text, Reply, example, botCtx, jadibotMgr } = ctx;

        const newName = (text || '').trim();
        if (!newName) return Reply(example('MyClone - MD'));
        if (newName.length > 60) return Reply('❌ Nama bot clone maksimal 60 karakter.');

        const oldName = botCtx.getJadibotIdentity(cloneNum).botname;
        const updated = patchCloneConfig(cloneNum, { botname: newName }, botCtx, jadibotMgr);
        Dinz.jadibotConfig = { ...(Dinz.jadibotConfig || {}), botname: updated.botname };

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🤖',
            title: 'NAMA BOT CLONE DIUBAH',
            rows: [
                { label: 'Sebelumnya', value: oldName },
                { label: 'Baru', value: updated.botname },
                { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
            ]
        }));
    }
};
