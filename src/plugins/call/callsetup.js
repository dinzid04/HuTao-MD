const { callEngine, formatCard, toMono, toSmallCaps } = require('./_helper');

module.exports = {
    name: 'callsetup',
    category: 'call',
    commands: ['callsetup', 'buildcaller'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        if (!isCreator) return Reply(global.mess.owner);
        await Dinz.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } }).catch(() => {});
        await Reply(
            `⚙️ Memulai build otomatis *HuTao - MD MeowCaller Bridge v2.3* (Pure Go, tanpa root)...\n` +
            `_${toSmallCaps('jika go belum ada di server, script otomatis mengunduh go portable terlebih dahulu. mohon tunggu 1-3 menit.')}_`
        );
        try {
            const res = await callEngine.buildBridge();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '✅',
                title: 'MEOWCALLER BRIDGE SIAP',
                rows: [
                    { label: 'Status', value: `🟢 Build sukses (v${toMono(res.health?.version || '2.3.0')})` },
                    { label: 'Fitur', value: 'YouTube Screen Share • Group Priority • Queue • Studio PCM' },
                    { label: 'Akun Caller', value: res.health?.loggedIn ? `✅ ${toMono(res.health.jid.split(':')[0])}` : 'Belum dipairing' }
                ],
                footer: res.health?.loggedIn
                    ? `langsung coba ${pfx}callgrup audio studio alan walker`
                    : `lanjutkan dengan ${pfx}callpair 628xxx untuk menautkan akun caller`
            }));
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Build MeowCaller Bridge gagal:\n\`\`\`\n${String(err.message || err).slice(0, 1200)}\n\`\`\``);
        }
        return true;
    }
};
