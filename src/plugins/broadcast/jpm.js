module.exports = {
    name: 'jpm',
    category: 'broadcast',
    commands: ['jpm'],

    async execute(ctx) {
        const { Dinz, text, mime, qmsg, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const isMedia = /image|video/.test(mime);
        const teks = text || '';

        if (!teks && !isMedia) return Reply(`\`⌜ JPM ⌟\`\n> ◦ Format salah!\n\n📌 *Contoh:*\n> 1. jpm pesan broadcast\n> 2. Reply media + caption jpm pesan`);

        const allGrup = await Dinz.groupFetchAllParticipating();
        const res = Object.keys(allGrup);
        let count = 0;
        const delayJpm = global.db.settings.delayJpm || 3000;

        let mediaPath = null;
        if (isMedia) {
            mediaPath = await qmsg.download ? await qmsg.download() : null;
            await Reply(`\`⌜ Proses JPM ⌟\`\n> ◦ Total Grup : *${res.length}*\n> ◦ Tipe : *Media + Teks*\n> ◦ Delay : *${delayJpm}ms*`);
        } else {
            await Reply(`\`⌜ Proses JPM ⌟\`\n> ◦ Total Grup : *${res.length}*\n> ◦ Tipe : *Teks*\n> ◦ Delay : *${delayJpm}ms*`);
        }

        for (let i of res) {
            if (global.db.groups[i]?.blacklistjpm === true) continue;
            try {
                if (isMedia) {
                    await Dinz.sendMessage(i, { [mime.split('/')[0]]: mediaPath, caption: teks });
                } else {
                    await Dinz.sendMessage(i, { text: teks });
                }
                count++;
            } catch (e) {
                console.error(`Gagal kirim JPM ke ${i}:`, e.message);
            }
            await new Promise(r => setTimeout(r, delayJpm));
        }
        await Reply(`\`⌜ JPM Selesai ⌟\`\n> ◦ Berhasil kirim ke : *${count} Grup*`);
        return true;
    }
};
