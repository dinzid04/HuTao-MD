const { callEngine, formatCard, toMono, getSavedDefaultQuality, getSavedDefaultAudioQuality } = require('./_helper');

module.exports = {
    name: 'callstatus',
    category: 'call',
    commands: ['callstatus', 'statuscall'],

    async execute(ctx) {
        const { body, Reply, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        try {
            const st = await callEngine.getStatus();
            const activeLines = st.activeCalls.length > 0
                ? st.activeCalls.map((c, idx) =>
                    `${idx + 1}. *${c.title || c.callId}* (${c.mode}/${c.callType}) — ${c.connected ? 'LIVE' : 'Menunggu'} (${c.elapsedSec}s) • Antrean: ${c.queueLength || 0}${c.linkUrl ? `\n   ${c.linkUrl}` : ''}`
                ).join('\n')
                : 'Tidak ada panggilan aktif.';

            return Reply(formatCard({
                icon: '📡',
                title: 'STATUS MEOWCALLER BRIDGE',
                rows: [
                    { label: 'Binary', value: st.installed ? `✅ Terpasang (v${toMono(st.version)})` : '❌ Belum dibuild (.callsetup)' },
                    { label: 'Fitur Engine', value: st.supportsGroup ? '✅ Siap (v2.3 Screen Share + Queue)' : '⚠️ Auto-update saat .playcall / .callsetup' },
                    { label: 'Kualitas Default', value: `${toMono(getSavedDefaultQuality())} • ${toMono(getSavedDefaultAudioQuality())}` },
                    { label: 'Service', value: st.running ? `🟢 Aktif (Port ${toMono(st.port)})` : st.building ? '⏳ Sedang Build...' : '⚪ Standby' },
                    { label: 'Akun Caller', value: st.loggedIn ? `✅ ${toMono(st.jid.split(':')[0])}` : '❌ Belum Pairing (.callpair)' }
                ],
                body: activeLines,
                footer: `owner: ${pfx}callsetup • ${pfx}callpair <nomor> • ${pfx}calllogout`
            }));
        } catch (err) {
            return Reply(`❌ Gagal cek status call engine: ${err.message}`);
        }
        return true;
    }
};
