const { formatCard, getGroupObj } = require('./_helper');
const presenceSvc = require('../../services/presence');

module.exports = {
    name: 'sider',
    category: 'group',
    commands: ['sider', 'ceksider', 'jarangnimbrung', 'kicksider', 'ghost'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, botNumberOnly, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const cmd = String(command || '').toLowerCase();

        if (cmd === 'kicksider' && !m.isAdmin && !isCreator) {
            return Reply(global.mess.admin);
        }

        let meta;
        try {
            meta = await (Dinz.safeGroupMetadata ? Dinz.safeGroupMetadata(m.chat) : Dinz.groupMetadata(m.chat));
        } catch (err) {
            return Reply(`❌ Gagal membaca daftar member grup: ${err.message}`);
        }

        const participants = Array.isArray(meta?.participants) ? meta.participants : [];
        if (!participants.length) return Reply('❌ Data member grup kosong.');

        let days = 7;
        let minMsgs = 3;
        let tagAll = false;

        for (let i = 0; i < args.length; i++) {
            const a = String(args[i] || '').toLowerCase();
            if (a === 'tag' || a === 'colek' || a === 'mention') tagAll = true;
            else if (a === 'min' && /^\d+$/.test(args[i + 1] || '')) {
                minMsgs = Math.max(1, parseInt(args[i + 1], 10));
                i++;
            } else if (/^\d+$/.test(a)) {
                days = Math.min(365, Math.max(1, parseInt(a, 10)));
            }
        }

        const g = getGroupObj(m.chat);
        const stats = g.chatStats || {};
        const statsByCanon = new Map();
        for (const [k, v] of Object.entries(stats)) {
            const c = presenceSvc.canonicalNum(k);
            if (!c) continue;
            const prev = statsByCanon.get(c) || { count: 0, lastChat: 0 };
            statsByCanon.set(c, {
                count: prev.count + (Number(v?.count) || 0),
                lastChat: Math.max(prev.lastChat, Number(v?.lastChat) || 0)
            });
        }

        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        const ownerNum = String(global.owner || '').replace(/[^0-9]/g, '');

        const neverChatted = [];
        const rarelyActive = [];

        for (const p of participants) {
            const rawJid = p.jid || p.phoneNumber || p.id;
            const canon = presenceSvc.canonicalNum(rawJid);
            if (!canon) continue;
            if (canon === botNumberOnly || canon === ownerNum) continue;
            const isAdmin = Boolean(p.admin === 'admin' || p.admin === 'superadmin');
            const st = statsByCanon.get(canon) || { count: 0, lastChat: 0 };

            if (st.count === 0) {
                neverChatted.push({ jid: `${canon}@s.whatsapp.net`, targetId: p.id || rawJid, canon, isAdmin, count: 0, lastChat: 0 });
            } else if (st.count < minMsgs || (st.lastChat > 0 && st.lastChat < cutoff)) {
                const inactiveDays = st.lastChat ? Math.floor((now - st.lastChat) / 86400000) : days;
                rarelyActive.push({ jid: `${canon}@s.whatsapp.net`, targetId: p.id || rawJid, canon, isAdmin, count: st.count, inactiveDays });
            }
        }

        const allSiders = [...neverChatted, ...rarelyActive];

        if (cmd === 'kicksider') {
            if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
            const kickTargets = allSiders.filter((x) => !x.isAdmin);
            if (!kickTargets.length) return Reply('✅ Tidak ada member non-admin yang masuk kategori sider.');
            if ((args[0] || '').toLowerCase() !== 'confirm') {
                return Reply(
                    `⚠️ *Konfirmasi Kick Sider*\n` +
                    `> ◦ Target : *${kickTargets.length} member* (non-admin)\n` +
                    `> ◦ Kriteria : 0 chat / <${minMsgs} chat / pasif >${days} hari\n` +
                    `> ◦ Ketik \`${usedPrefix}kicksider confirm\` untuk melanjutkan (maks 10 per eksekusi demi keamanan akun).`
                );
            }
            const batch = kickTargets.slice(0, 10);
            let kicked = 0;
            for (const t of batch) {
                try {
                    await Dinz.groupParticipantsUpdate(m.chat, [t.targetId], 'remove');
                    kicked++;
                    await new Promise((r) => setTimeout(r, 1800));
                } catch (_) {}
            }
            return Reply(`✅ Berhasil mengeluarkan *${kicked}/${batch.length}* member sider dari grup.`);
        }

        if (!allSiders.length) {
            return Reply(`🎉 Mantap! Tidak ada member pasif/jarang nimbrung di grup ini (filter: <${minMsgs} chat atau pasif >${days} hari).`);
        }

        const maxShow = 40;
        const lines = [];
        if (neverChatted.length) {
            lines.push(`*👻 Belum Pernah Chat (${neverChatted.length}):*`);
            neverChatted.slice(0, 25).forEach((x, i) => {
                lines.push(`${i + 1}. @${x.canon}${x.isAdmin ? ' [Admin]' : ''} — 0 pesan`);
            });
        }
        if (rarelyActive.length) {
            lines.push(`\n*💤 Jarang Nimbrung (${rarelyActive.length}):*`);
            rarelyActive.slice(0, 15).forEach((x, i) => {
                lines.push(`${i + 1}. @${x.canon}${x.isAdmin ? ' [Admin]' : ''} — ${x.count} pesan (${x.inactiveDays}h lalu)`);
            });
        }

        const shownMentions = tagAll ? allSiders.slice(0, maxShow).map((x) => x.jid) : [];
        return Reply(
            formatCard({
                icon: '👻',
                title: `DETEKSI JARANG NIMBRUNG (${allSiders.length})`,
                rows: [
                    { label: 'Total Member', value: `${participants.length} orang` },
                    { label: '0 Pesan (Ghost)', value: `${neverChatted.length} orang` },
                    { label: 'Jarang Nimbrung', value: `${rarelyActive.length} orang (<${minMsgs} chat / >${days} hari)` }
                ],
                body: lines.join('\n'),
                footer: `Colek semua: ${usedPrefix}sider tag | Filter hari: ${usedPrefix}sider 3 | Bersihkan: ${usedPrefix}kicksider confirm`
            }),
            shownMentions
        );
    }
};
