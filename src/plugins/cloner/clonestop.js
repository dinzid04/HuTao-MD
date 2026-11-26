const { formatCard, toMono, requireClonerOwner } = require('./_helper');

module.exports = {
    name: 'clonestop',
    category: 'cloner',
    commands: ['clonestop', 'stopclone', 'stopmybot', 'matikanclone'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, Reply, jadibotMgr } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '⏸️', key: m.key } }).catch(() => {});
        await Reply(formatCard({
            icon: '⏸️',
            title: 'MENGHENTIKAN BOT CLONE',
            rows: [
                { label: 'Nomor Clone', value: toMono(cloneNum) },
                { label: 'Status', value: 'Menghentikan sesi clone ini saja...' },
                { label: 'Data & Session', value: 'Tetap tersimpan (Bot Utama & Clone lain aman)' }
            ],
            footer: 'Untuk menyalakan kembali nanti, hubungi Owner Bot Utama agar menjalankan restartjadibot.'
        }));

        await jadibotMgr.stopJadibot(cloneNum, { immediate: false });
        return true;
    }
};
