const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'slowmode',
    category: 'group',
    commands: ['slowmode'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const arg = (args[0] || '').toLowerCase();
        if (!arg) {
            const cur = getGroupObj(m.chat).slowmode || 0;
            return Reply(`⏱️ Slowmode saat ini: *${cur ? cur + ' detik' : 'Nonaktif'}*.\nPakai \`${usedPrefix}slowmode 10\` (detik) atau \`${usedPrefix}slowmode off\`.`);
        }
        if (arg === 'off' || arg === '0') {
            getGroupObj(m.chat).slowmode = 0;
            return Reply('✅ Slowmode dinonaktifkan.');
        }
        const sec = parseInt(arg, 10);
        if (isNaN(sec) || sec < 2 || sec > 300) return Reply('❌ Masukkan jeda antara 2 sampai 300 detik.');
        getGroupObj(m.chat).slowmode = sec;
        return Reply(`⏱️ Slowmode diaktifkan: member hanya boleh kirim pesan tiap *${sec} detik*.`);
    }
};
