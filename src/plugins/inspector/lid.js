const { formatCard, resolveFullIdentity } = require('./_helper');

module.exports = {
    name: 'lid',
    category: 'inspector',
    commands: [
        'lid', 'ceklid', 'lidinfo', 'inspectlid', 'getlid', 'jid', 'cekjid'
    ],

    async execute(ctx) {
        const {
            Dinz, m, store, text, quoted, isCreator, Reply, loadOwners, botCtx, usedPrefix,
            isPremiumUser
        } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '🔍', key: m.key } }).catch(() => {});
        try {
            const info = await resolveFullIdentity({
                Dinz,
                m,
                store,
                rawInput: text,
                isCreator,
                isPremiumUser,
                loadOwners,
                botCtx
            });

            const waStatus = info.waExists === true
                ? 'Aktif di WhatsApp'
                : info.waExists === false
                    ? 'Tidak Terdaftar'
                    : 'Tidak Dicek';

            const rows = [
                { label: 'Nama', value: info.displayName },
                { label: 'Nomor HP', value: info.phoneNum ? `${info.intl} (${info.phoneNum})` : 'Belum Ter-resolve' },
                { label: 'Negara', value: info.country },
                { label: 'JID', value: info.jid ? `\`${info.jid}\`` : '_Belum ditemukan_' },
                { label: 'LID', value: info.lid ? `\`${info.lid}\`` : '_Belum terekam (butuh interaksi grup)_' },
                { label: 'ID LID', value: info.lidNum ? `\`${info.lidNum}\`` : '-' },
                { label: 'Status WA', value: waStatus },
                { label: 'Role Grup', value: info.groupRole },
                { label: 'Status Bot', value: info.botRole },
                { label: 'Metode', value: `${info.inputType} (${info.sources})` },
                { label: 'Cache LID', value: `${info.totalCached} akun tersimpan` }
            ];

            const card = formatCard({
                icon: '🪪',
                title: 'LID & JID INSPECTOR',
                rows,
                footer: `Tip: ${usedPrefix}lid @tag | reply | 628xxx | 12345@lid  |  ${usedPrefix}listlid (di grup)`
            });

            const mentions = info.jid ? [info.jid] : [];
            await Dinz.sendMessage(m.chat, { text: card, mentions }, { quoted: m });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memeriksa LID/JID: ${err.message}`);
        }
        return true;
    }
};
