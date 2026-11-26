const { formatCard, cleanDigits } = require('./_helper');

module.exports = {
    name: 'inspect',
    category: 'inspector',
    commands: ['inspect', 'inspectgc', 'cekgrup', 'ceksaluran', 'channelinfo'],

    async execute(ctx) {
        const { Dinz, m, text, body, quoted, Reply, moment, usedPrefix } = ctx;

        const input = (text || m.quoted?.body || '').trim();
        if (!input) {
            return Reply(formatCard({
                icon: '🔎',
                title: 'WHATSAPP INSPECT',
                body: `Cek detail grup atau saluran WhatsApp via link.\n\nContoh:\n◦ ${usedPrefix}inspect https://chat.whatsapp.com/xxxxx\n◦ ${usedPrefix}inspect https://whatsapp.com/channel/xxxxx`
            }));
        }

        const gcMatch = input.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{10,})/);
        const chMatch = input.match(/whatsapp\.com\/channel\/([0-9A-Za-z]{10,})/);

        await Dinz.sendMessage(m.chat, { react: { text: '🔍', key: m.key } }).catch(() => {});
        try {
            if (gcMatch) {
                const info = await Dinz.groupGetInviteInfo(gcMatch[1]);
                const created = info.creation
                    ? moment(info.creation * 1000).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm [WIB]')
                    : '-';
                const rows = [
                    { label: 'Nama Grup', value: info.subject || '-' },
                    { label: 'Group JID', value: `\`${info.id || '-'}\`` },
                    { label: 'Dibuat', value: created },
                    { label: 'Creator', value: info.owner ? `@${cleanDigits(info.owner)}` : '-' },
                    { label: 'Total Member', value: String(info.size || info.participants?.length || 0) },
                    { label: 'Edit Info Admin Only', value: info.restrict ? 'Ya' : 'Tidak' },
                    { label: 'Chat Admin Only', value: info.announce ? 'Ya' : 'Tidak' },
                    { label: 'Persetujuan Join', value: info.joinApprovalMode ? 'Aktif' : 'Nonaktif' },
                    { label: 'Komunitas', value: info.isCommunity ? 'Ya' : 'Tidak' }
                ];
                const body = info.desc ? `*Deskripsi:*\n${String(info.desc).slice(0, 600)}` : '';
                const card = formatCard({ icon: '👥', title: 'GROUP INSPECTOR', rows, body });
                const mentions = info.owner ? [info.owner] : [];
                await Dinz.sendMessage(m.chat, { text: card, mentions }, { quoted: m });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            } else if (chMatch || input.endsWith('@newsletter')) {
                const code = chMatch ? chMatch[1] : input;
                const fn = Dinz.newsletterMetadata || Dinz.newsletterMsg;
                if (typeof fn !== 'function') {
                    return Reply('❌ Versi Baileys saat ini tidak mendukung lookup metadata saluran.');
                }
                const ch = chMatch
                    ? await fn.call(Dinz, 'invite', code).catch(() => fn.call(Dinz, code))
                    : await fn.call(Dinz, 'jid', code).catch(() => fn.call(Dinz, code));
                const tm = ch?.thread_metadata || ch || {};
                const created = tm.creation_time
                    ? moment(Number(tm.creation_time) * 1000).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm [WIB]')
                    : '-';
                const rows = [
                    { label: 'Nama Saluran', value: tm.name?.text || tm.name || '-' },
                    { label: 'Channel JID', value: `\`${ch?.id || '-'}\`` },
                    { label: 'Status', value: ch?.state?.type || 'ACTIVE' },
                    { label: 'Subscribers', value: Number(tm.subscribers_count || 0).toLocaleString('id-ID') },
                    { label: 'Verifikasi', value: tm.verification || '-' },
                    { label: 'Dibuat', value: created }
                ];
                const desc = tm.description?.text || tm.description || '';
                const card = formatCard({
                    icon: '📢',
                    title: 'CHANNEL INSPECTOR',
                    rows,
                    body: desc ? `*Deskripsi:*\n${String(desc).slice(0, 600)}` : ''
                });
                await Reply(card);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            } else {
                return Reply('❌ Masukkan tautan grup (`chat.whatsapp.com/...`) atau saluran (`whatsapp.com/channel/...`) yang valid.');
            }
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal inspect link: ${err.message}`);
        }
        return true;
    }
};
