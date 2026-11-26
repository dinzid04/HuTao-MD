module.exports = {
    name: 'jpmtag',
    category: 'broadcast',
    commands: ['jpmtag'],

    async execute(ctx) {
        const { Dinz, text, mime, qmsg, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const isMedia = /image|video/.test(mime);
        const teks = text || '';

        if (!teks && !isMedia) return Reply(`\`⌜ JPM Tag ⌟\`\n> ◦ Format salah!\n\n📌 *Contoh:*\n> 1. jpmtag pesan broadcast\n> 2. Reply media + caption jpmtag pesan`);

        const allGrup = await Dinz.groupFetchAllParticipating();
        const res = Object.keys(allGrup);
        let count = 0;
        const delayJpm = global.db.settings.delayJpm || 3000;

        let mediaPath = null;
        if (isMedia) {
            mediaPath = await qmsg.download ? await qmsg.download() : null;
            await Reply(`\`⌜ Proses JPM Tag ⌟\`\n> ◦ Total Grup : *${res.length}*\n> ◦ Tipe : *Media + Teks (Tag All)*\n> ◦ Delay : *${delayJpm}ms*`);
        } else {
            await Reply(`\`⌜ Proses JPM Tag ⌟\`\n> ◦ Total Grup : *${res.length}*\n> ◦ Tipe : *Teks (Tag All)*\n> ◦ Delay : *${delayJpm}ms*`);
        }

        for (let i of res) {
            if (global.db.groups[i]?.blacklistjpm === true) continue;
            try {
                const meta = await Dinz.groupMetadata(i).catch(() => null);
                const participants = meta ? meta.participants.map(p => p.id) : [];
                if (isMedia) {
                    await Dinz.sendMessage(i, { [mime.split('/')[0]]: mediaPath, caption: teks, mentions: participants });
                } else {
                    await Dinz.sendMessage(i, { text: teks, mentions: participants });
                }
                count++;
            } catch (e) {
                console.error(`Gagal kirim JPM Tag ke ${i}:`, e.message);
            }
            await new Promise(r => setTimeout(r, delayJpm));
        }
        await Reply(`\`⌜ JPM Tag Selesai ⌟\`\n> ◦ Berhasil kirim ke : *${count} Grup*`);
        return true;
    }
};
