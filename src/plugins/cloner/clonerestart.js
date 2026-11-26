const { formatCard, toMono, requireClonerOwner } = require('./_helper');

module.exports = {
    name: 'clonerestart',
    category: 'cloner',
    commands: ['clonerestart', 'restartclone', 'restartmybot'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, Reply, jadibotMgr } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '🔄', key: m.key } }).catch(() => {});
        await Reply(formatCard({
            icon: '🔄',
            title: 'RESTART BOT CLONE',
            rows: [
                { label: 'Nomor Clone', value: toMono(cloneNum) },
                { label: 'Status', value: 'Menghubungkan ulang sesi clone ini...' },
                { label: 'Scope', value: 'Khusus Clone Ini (Bot Utama & Clone lain aman)' }
            ]
        }));

        setTimeout(() => {
            jadibotMgr.restartJadibot(cloneNum).catch((e) => {
                console.error(`[Cloner Restart ${cloneNum}]`, e?.message || e);
            });
        }, 700);
        return true;
    }
};
