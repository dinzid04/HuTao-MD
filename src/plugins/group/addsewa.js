module.exports = {
    name: 'addsewa',
    category: 'group',
    commands: ['addsewa', 'renewsewa'],

    async execute(ctx) {
        const {
            Dinz, m, args, text, isCreator, Reply, example, getSewaNotified, saveSewaNotified,
            botCtx
        } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(example("<jumlah hari> atau <link gc> <jumlah hari>"));

        let groupId, groupName, days;
        let joinStatus = "✅ Sudah di dalam grup";

        if (args[0] && args[0].includes('chat.whatsapp.com')) {
            const link = args[0];
            days = parseInt(args[1]);

            if (isNaN(days)) return Reply(`❌ Masukkan jumlah hari!`);

            const inviteCode = link.split("chat.whatsapp.com/")[1].split("?")[0];

            try {
                try {
                    const res = await Dinz.groupAcceptInvite(inviteCode);
                    groupId = res;
                    joinStatus = "✅ Berhasil join via link";
                } catch (e) {
                    const meta = await Dinz.groupGetInviteInfo(inviteCode);
                    groupId = meta.id;
                    joinStatus = "⏳ Pending (Tautan valid, bot akan join jika di-approve)";
                }
            } catch (e) {
                return Reply(`❌ Link tidak valid atau bot tidak bisa mengakses info grup.`);
            }
        } else if (!isNaN(parseInt(args[0]))) {
            if (!m.isGroup) return Reply(global.mess.group);
            days = parseInt(args[0]);
            groupId = m.chat;
        } else {
            return Reply(example("<jumlah hari> atau <link gc> <jumlah hari>"));
        }

        try {
            const meta = await Dinz.groupMetadata(groupId);
            groupName = meta.subject;
        } catch (e) {
            groupName = "Grup Tidak Dikenal";
        }

        let sewagrup = Array.isArray(botCtx.getSection('sewagrup', Dinz)) ? [...botCtx.getSection('sewagrup', Dinz)] : [];
        const now = Date.now();
        const durationMs = days * 24 * 60 * 60 * 1000;

        const existing = sewagrup.find(v => v.jid === groupId);
        let expiredDate;

        if (existing) {
            if (existing.expired > now) {
                existing.expired += durationMs;
            } else {
                existing.expired = now + durationMs;
            }
            existing.warningSent = false;
            expiredDate = existing.expired;
        } else {
            expiredDate = now + durationMs;
            sewagrup.push({
                jid: groupId,
                expired: expiredDate,
                warningSent: false
            });
        }

        botCtx.setSection('sewagrup', sewagrup, Dinz);

        try {
            const notified = getSewaNotified(Dinz);
            if (notified[groupId]) {
                delete notified[groupId];
                saveSewaNotified(notified, Dinz);
            }
        } catch (e) {}

        const expiredFormat = new Date(expiredDate).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const teksSewa = `\`⌜ Sewa Group ⌟\`\n> ◦ Grup : *${groupName}*\n> ◦ Durasi : *${days} Hari*\n> ◦ Expired : *${expiredFormat}*\n> ◦ Status : *Berhasil ${existing ? 'Diperpanjang' : 'Ditambahkan'}*`;
        Reply(teksSewa);
        return true;
    }
};
