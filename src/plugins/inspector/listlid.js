const { formatCard, recordLidMapping, resolveLidToPhone, resolvePhoneToLid, isLikelyLidNumber, cleanDigits } = require('./_helper');

module.exports = {
    name: 'listlid',
    category: 'inspector',
    commands: ['listlid', 'grouplid', 'alllid'],

    async execute(ctx) {
        const { Dinz, m, store, args, text, body, quoted, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        await Dinz.sendMessage(m.chat, { react: { text: '📋', key: m.key } }).catch(() => {});
        try {
            const meta = await Dinz.groupMetadata(m.chat).catch(() => m.metadata);
            const participants = meta?.participants || [];
            if (!participants.length) return Reply('❌ Gagal mengambil daftar member grup.');

            recordLidMapping(participants, meta, Dinz);

            const pageSize = 20;
            const totalPages = Math.max(1, Math.ceil(participants.length / pageSize));
            const reqPage = Math.min(totalPages, Math.max(1, parseInt(args[0], 10) || 1));
            const start = (reqPage - 1) * pageSize;
            const slice = participants.slice(start, start + pageSize);

            let mappedCount = 0;
            for (const p of participants) {
                const pLid = [p.lid, p.id].find((x) => String(x || '').includes('@lid'))
                    || resolvePhoneToLid(p.jid || p.id || '', meta);
                if (pLid) mappedCount++;
            }

            const lines = [];
            const mentions = [];
            for (let i = 0; i < slice.length; i++) {
                const p = slice[i];
                const idx = start + i + 1;
                let pPhone = '';
                let pLid = '';
                for (const f of [p.jid, p.phoneNumber, p.id, p.lid].filter(Boolean)) {
                    const s = String(f);
                    const d = cleanDigits(s);
                    if (!d) continue;
                    if (s.includes('@lid') || isLikelyLidNumber(d)) {
                        if (!pLid) pLid = d + '@lid';
                    } else if (!pPhone) {
                        pPhone = d + '@s.whatsapp.net';
                    }
                }
                if (!pPhone && pLid) {
                    const r = resolveLidToPhone(pLid, meta);
                    if (r && !r.endsWith('@lid')) pPhone = r;
                }
                if (!pLid && pPhone) {
                    pLid = resolvePhoneToLid(pPhone, meta);
                }

                const numKey = cleanDigits(pPhone);
                const lidKey = cleanDigits(pLid);
                const name = p.notify || p.name || p.verifiedName
                    || global.lidNames?.[numKey] || global.lidNames?.[lidKey]
                    || store?.contacts?.[pPhone]?.notify || store?.contacts?.[pPhone]?.name
                    || (numKey || lidKey || 'Member');
                const roleTag = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '🛡️' : '👤';
                if (pPhone) mentions.push(pPhone);

                lines.push(
                    `${idx}. ${roleTag} *${name}*\n` +
                    `   ◦ JID: ${pPhone ? `\`${pPhone}\`` : '_belum ter-resolve_'}\n` +
                    `   ◦ LID: ${pLid ? `\`${pLid}\`` : '_belum terekam_'}`
                );
            }

            const pct = Math.round((mappedCount / participants.length) * 100);
            const card = formatCard({
                icon: '📑',
                title: `GROUP LID INSPECTOR (${reqPage}/${totalPages})`,
                rows: [
                    { label: 'Grup', value: meta.subject || m.chat },
                    { label: 'Group JID', value: `\`${m.chat}\`` },
                    { label: 'Mode Alamat', value: meta.addressingMode || 'standard' },
                    { label: 'Total Member', value: `${participants.length} (${mappedCount} LID terdata / ${pct}%)` }
                ],
                body: lines.join('\n'),
                footer: totalPages > 1
                    ? `Halaman ${reqPage}/${totalPages} | Ketik ${usedPrefix}listlid ${reqPage < totalPages ? reqPage + 1 : 1} untuk halaman lain`
                    : `Menampilkan seluruh ${participants.length} member`
            });

            await Dinz.sendMessage(m.chat, { text: card, mentions }, { quoted: m });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengambil daftar LID grup: ${err.message}`);
        }
        return true;
    }
};
