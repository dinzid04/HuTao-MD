const { formatCard } = require('./_helper');
const presenceSvc = require('../../services/presence');

module.exports = {
    name: 'cekonline',
    category: 'group',
    commands: ['cekonline', 'listonline', 'online'],

    async execute(ctx) {
        const { Dinz, m, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        await Dinz.sendMessage(m.chat, { react: { text: '📡', key: m.key } }).catch(() => {});

        let participants = [];
        let subject = '';
        try {
            const meta = await (Dinz.safeGroupMetadata ? Dinz.safeGroupMetadata(m.chat) : Dinz.groupMetadata(m.chat));
            participants = Array.isArray(meta?.participants) ? meta.participants : [];
            subject = meta?.subject || '';
        } catch (_) {}

        await presenceSvc.probeGroupPresence(Dinz, m.chat, participants);
        const list = presenceSvc.getLiveOnlineMembers(Dinz, m.chat, participants);

        if (!list.length) {
            return Reply('💤 Belum ada member yang terdeteksi online saat ini (beberapa akun menyembunyikan status Online/Last Seen).');
        }

        const liveCount = list.filter((x) => x.priority >= 2).length;
        const body = list.slice(0, 35).map((item, idx) => `${idx + 1}. @${item.canon} — ${item.label}`).join('\n');
        const mentions = list.slice(0, 35).map((x) => x.jid);

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(
            formatCard({
                icon: '🟢',
                title: `LIST ONLINE REALTIME (${list.length})`,
                rows: [
                    { label: 'Grup', value: subject || 'Grup Ini' },
                    { label: 'Online Live WA', value: `${liveCount} orang` },
                    { label: 'Baru Aktif (<10m)', value: `${list.length - liveCount} orang` }
                ],
                body,
                footer: 'Status Live diambil dari presence.update WhatsApp realtime'
            }),
            mentions
        );
    }
};
