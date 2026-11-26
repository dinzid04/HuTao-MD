const { formatCard } = require('../../utils/formatter');

function formatUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (d) parts.push(`${d}h`);
    if (h) parts.push(`${h}j`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}d`);
    return parts.join(' ');
}

module.exports = {
    name: 'clonerstats',
    category: 'jadibot',
    commands: ['clonerstats', 'monitorcloner', 'cekclonerall'],

    async execute(ctx) {
        const { Dinz, isCreator, isMainOwner, Reply, jadibotMgr, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        const stats = jadibotMgr.getClonerStats();
        const maxLabel = stats.limits.maxCloner === 0 ? 'Unlimited' : String(stats.limits.maxCloner);
        const cdLabel = stats.limits.broadcastCooldownMs === 0
            ? 'Nonaktif'
            : `${Math.round(stats.limits.broadcastCooldownMs / 60000)} menit`;

        let detailBody = '';
        if (stats.clones.length === 0) {
            detailBody = 'Belum ada bot cloner yang terdaftar.';
        } else {
            detailBody = stats.clones.map((c, idx) => {
                const icon = c.status === 'running' ? '🟢' : c.status === 'pairing' ? '🟡' : '🔴';
                return (
                    `${idx + 1}. ${icon} *${c.botname}* (\`${c.number}\`)\n` +
                    `   ◦ Status: *${c.status}* | Owner: \`${c.owner}\`\n` +
                    `   ◦ DB Isolasi: ${c.users} user, ${c.groups} grup | Exp: ${c.remaining}`
                );
            }).join('\n');
        }

        return Reply(formatCard({
            icon: '📊',
            title: 'MONITORING CLONER & RESOURCE',
            rows: [
                { label: 'Cloner Aktif', value: `${stats.activeCount} / ${maxLabel} (${stats.totalRegistered} terdaftar)` },
                { label: 'Anti-Ban Broadcast', value: cdLabel },
                { label: 'RAM Proses (RSS)', value: `${stats.rssMb} MB (Heap: ${stats.heapUsedMb}/${stats.heapTotalMb} MB)` },
                { label: 'Uptime Server', value: formatUptime(stats.uptimeSec) }
            ],
            body: detailBody,
            footer: `Atur batas: ${usedPrefix}setjadibot max <angka> | ${usedPrefix}setjadibot jpmcd <menit>`
        }));
    }
};
