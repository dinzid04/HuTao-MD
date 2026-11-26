const { processAudioFilter, parseTimestampSec, formatTimestamp } = require('./_helper');

module.exports = {
    name: 'cutaudio',
    category: 'audio',
    commands: ['cutaudio', 'potongaudio', 'trim'],

    async execute(ctx) {
        const { args, Reply, usedPrefix, command } = ctx;

        let startRaw = args[0] || '';
        let endRaw = args[1] || '';
        if (startRaw.includes('-') && !endRaw) {
            const sp = startRaw.split('-');
            startRaw = sp[0];
            endRaw = sp[1];
        }

        const startSec = parseTimestampSec(startRaw);
        const endSec = parseTimestampSec(endRaw);

        if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
            return Reply(
                `\`⌜ Potong Audio (Cut Audio) ⌟\`\n` +
                `> ◦ *Cara pakai :* Reply audio/VN/video dengan format:\n` +
                `> ◦ \`${usedPrefix}${command} <mulai> <akhir>\`\n` +
                `> ◦ *Contoh 1 :* \`${usedPrefix}${command} 0:15 0:45\`\n` +
                `> ◦ *Contoh 2 :* \`${usedPrefix}${command} 10 35\``
            );
        }

        const duration = endSec - startSec;
        if (duration > 600) {
            return Reply('❌ Maksimal durasi potongan adalah 10 menit (600 detik).');
        }

        return processAudioFilter(ctx, {
            effectName: `Cut ${formatTimestamp(startSec)}-${formatTimestamp(endSec)}`,
            filter: null,
            extraInputArgs: ['-ss', String(startSec)],
            extraOutputArgs: ['-t', String(duration)]
        });
    }
};
