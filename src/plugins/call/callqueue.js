const { callEngine, formatCard, toMono, toSmallCaps } = require('./_helper');

module.exports = {
    name: 'callqueue',
    category: 'call',
    commands: ['callqueue', 'antreancall', 'queuelist', 'calllist'],

    async execute(ctx) {
        const { body, Reply, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        try {
            const active = await callEngine.getActiveCall();
            if (!active) {
                return Reply(`ℹ️ Tidak ada panggilan atau antrean musik yang sedang berjalan.\nMulai dengan ${toMono(`${pfx}callgrup audio studio <judul>`)}.`);
            }
            const qList = Array.isArray(active.queue) ? active.queue : [];
            const lines = [
                `*▶️ ${toSmallCaps('sedang diputar')}:*`,
                `1. *${active.title || 'Media Stream'}*${active.requestedBy ? ` — _${active.requestedBy}_` : ''}`,
                `   ${toMono(active.quality || active.mode)} • ${active.connected ? '🟢 LIVE' : '🟡 Menunggu'} (${active.elapsedSec || 0}s)`
            ];
            if (qList.length > 0) {
                lines.push('', `*📋 ${toSmallCaps('daftar antrean berikutnya')} (${qList.length}):*`);
                qList.forEach((item, idx) => {
                    lines.push(`${idx + 2}. *${item.title || '-'}*${item.requestedBy ? ` — _${item.requestedBy}_` : ''} (${toMono(item.mode || 'audio')})`);
                });
            } else {
                lines.push('', `_${toSmallCaps('antrean kosong. kirim .callgrup / .playcall lagi untuk menambah lagu ke antrean!')}_`);
            }
            return Reply(formatCard({
                icon: '🎶',
                title: 'DAFTAR ANTREAN CALL',
                rows: [
                    { label: 'Tipe Call', value: toMono(`${active.callType || 'call'} / ${active.mode || 'audio'}`) },
                    { label: 'Total Antrean', value: toMono(`${qList.length + 1} lagu`) }
                ],
                body: lines.join('\n'),
                footer: `${pfx}skipcall (lewati) • ${pfx}clearqueue (hapus antrean) • ${pfx}stopcall`
            }));
        } catch (err) {
            return Reply(`❌ Gagal cek antrean call: ${err.message}`);
        }
        return true;
    }
};
