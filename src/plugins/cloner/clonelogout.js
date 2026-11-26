const { formatCard, toMono, requireClonerOwner } = require('./_helper');

module.exports = {
    name: 'clonelogout',
    category: 'cloner',
    commands: ['clonelogout', 'logoutclone', 'hapusclone', 'delmyclone'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, args, Reply, jadibotMgr, usedPrefix } = ctx;

        const confirm = (args[0] || '').toLowerCase();
        if (!['confirm', 'ya', 'yes'].includes(confirm)) {
            return Reply(formatCard({
                icon: '⚠️',
                title: 'KONFIRMASI LOGOUT & HAPUS CLONE',
                rows: [
                    { label: 'Target', value: `Hanya Clone ${toMono(cloneNum)} (milik kamu sendiri)` }
                ],
                body:
                    `Tindakan ini akan memutuskan koneksi WhatsApp dan menghapus session + data clone ini secara permanen.\n` +
                    `Bot utama & clone lain TIDAK akan terpengaruh.\n\n` +
                    `Ketik \`${usedPrefix}clonelogout confirm\` untuk melanjutkan.`
            }));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🗑️', key: m.key } }).catch(() => {});
        await Reply(formatCard({
            icon: '🗑️',
            title: 'LOGOUT BOT CLONE',
            rows: [
                { label: 'Nomor Clone', value: toMono(cloneNum) },
                { label: 'Status', value: 'Sesi & database clone ini sedang dihapus permanen...' }
            ]
        }));

        await jadibotMgr.deleteJadibot(cloneNum);
        return true;
    }
};
