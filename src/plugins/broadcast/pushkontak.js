module.exports = {
    name: 'pushkontak',
    category: 'broadcast',
    commands: ['pushkontak'],

    async execute(ctx) {
        const { Dinz, text, quoted, mime, qmsg, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!m.isGroup) return Reply(global.mess.group);

        const isMedia = /image|video/.test(mime);
        const teks = text || '';

        if (!teks && !isMedia) return Reply(example("pesan yang ingin di-push ke member"));

        const members = m.metadata.participants.map(v => v.id);
        if (members.length === 0) return Reply("❌ Tidak ada member di grup ini.");

        let mediaBufPush = null;
        if (isMedia && qmsg.download) {
            mediaBufPush = await qmsg.download();
        }

        const delayPush = global.db.settings.delayPushKontak || 2000;
        global._pushRunning = true;
        let count = 0;

        Reply(`\`⌜ Push Kontak ⌟\`\n> ◦ Target : *${members.length} Member*\n> ◦ Delay : *${delayPush}ms*\n> ◦ Info : *Ketik stoppush untuk hentikan*`);

        for (let jid of members) {
            if (!global._pushRunning) break;
            const jidOnly = jid.split('@')[0].split(':')[0];
            if (jidOnly === (Dinz.user?.id || '').split('@')[0].split(':')[0]) continue;
            try {
                if (mediaBufPush) {
                    if (/image/.test(mime)) {
                        await Dinz.sendMessage(jid, { image: mediaBufPush, caption: teks });
                    } else if (/video/.test(mime)) {
                        await Dinz.sendMessage(jid, { video: mediaBufPush, caption: teks, mimetype: mime });
                    }
                } else {
                    await Dinz.sendMessage(jid, { text: teks });
                }
                count++;
            } catch (e) {
                console.error(`Gagal push ke ${jid}:`, e.message);
            }
            await new Promise(r => setTimeout(r, delayPush));
        }

        global._pushRunning = false;
        await Dinz.sendMessage(m.chat, {
            text: `\`⌜ Push Kontak Selesai ⌟\`\n> ◦ Berhasil : *${count} Member*\n> ◦ Gagal : *${members.length - count} Member*`
        }, { quoted: m });
        return true;
    }
};
