const { formatCard, resolveFullIdentity } = require('./_helper');

module.exports = {
    name: 'wastalk',
    category: 'inspector',
    commands: ['wastalk', 'stalkwa', 'whatsappstalk'],

    async execute(ctx) {
        const {
            Dinz, m, store, text, body, quoted, isCreator, Reply, loadOwners, moment, botCtx,
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
            if (!info.jid) {
                return Reply('❌ Nomor/target tidak valid atau belum ter-resolve ke JID WhatsApp.');
            }
            if (info.waExists === false) {
                return Reply(`❌ Nomor *${info.phoneNum}* tidak terdaftar di WhatsApp.`);
            }

            let ppUrl = null;
            try { ppUrl = await Dinz.profilePictureUrl(info.jid, 'image'); } catch (_) {}

            let bio = {};
            try {
                const st = await Dinz.fetchStatus(info.jid);
                bio = Array.isArray(st) ? (st[0]?.status || st[0] || {}) : (st || {});
            } catch (_) {}

            let biz = null;
            try { biz = await Dinz.getBusinessProfile(info.jid); } catch (_) {}

            const bioText = typeof bio === 'string' ? bio : (bio.status || '-');
            const bioAt = bio.setAt ? moment(bio.setAt).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm [WIB]') : '-';

            const rows = [
                { label: 'Nama', value: info.displayName },
                { label: 'Nomor', value: info.intl },
                { label: 'Negara', value: info.country },
                { label: 'JID', value: `\`${info.jid}\`` },
                { label: 'LID', value: info.lid ? `\`${info.lid}\`` : '-' },
                { label: 'Link WA', value: `wa.me/${info.phoneNum}` },
                { label: 'Bio / About', value: bioText },
                { label: 'Update Bio', value: bioAt },
                { label: 'Tipe Akun', value: biz ? 'WhatsApp Business' : 'WhatsApp Standar' }
            ];
            if (biz) {
                if (biz.category) rows.push({ label: 'Kategori Bisnis', value: biz.category });
                if (biz.email) rows.push({ label: 'Email Bisnis', value: biz.email });
                if (biz.address) rows.push({ label: 'Alamat', value: biz.address });
                if (biz.website?.length) rows.push({ label: 'Website', value: biz.website.join(', ') });
            }

            const card = formatCard({
                icon: '📱',
                title: 'WHATSAPP STALKER',
                rows,
                body: biz?.description ? `*Deskripsi Bisnis:*\n${biz.description}` : ''
            });

            if (ppUrl) {
                await Dinz.sendMessage(m.chat, { image: { url: ppUrl }, caption: card, mentions: [info.jid] }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, { text: card, mentions: [info.jid] }, { quoted: m });
            }
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal stalk WhatsApp: ${err.message}`);
        }
        return true;
    }
};
