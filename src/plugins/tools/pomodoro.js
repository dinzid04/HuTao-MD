const { cleanNum } = require('./_helper');

module.exports = {
    name: 'pomodoro',
    category: 'tools',
    commands: ['pomodoro'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, usedPrefix } = ctx;

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'stop') {
            if (global.pomodoroTimers[m.sender]) {
                clearTimeout(global.pomodoroTimers[m.sender]);
                delete global.pomodoroTimers[m.sender];
                return Reply('⏹️ Timer Pomodoro dihentikan.');
            }
            return Reply('❌ Kamu tidak punya timer Pomodoro aktif.');
        }
        const mins = Math.min(120, Math.max(1, parseInt(args[0], 10) || 25));
        const label = args.slice(1).join(' ').trim() || 'Sesi Fokus';
        if (global.pomodoroTimers[m.sender]) clearTimeout(global.pomodoroTimers[m.sender]);
        global.pomodoroTimers[m.sender] = setTimeout(() => {
            delete global.pomodoroTimers[m.sender];
            Dinz.sendMessage(m.chat, {
                text: `🍅 *POMODORO SELESAI!*\n@${cleanNum(m.sender)}, waktu fokus *${mins} menit* (${label}) telah berakhir. Saatnya istirahat sejenak!`,
                mentions: [m.sender]
            }).catch(() => {});
        }, mins * 60000);
        if (global.pomodoroTimers[m.sender].unref) global.pomodoroTimers[m.sender].unref();
        return Reply(`🍅 *Pomodoro dimulai!* (${mins} menit - ${label})\nKetik \`${usedPrefix}pomodoro stop\` untuk membatalkan.`);
    }
};
