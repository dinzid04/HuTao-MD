module.exports = {
    name: 'jpmto',
    category: 'broadcast',
    commands: ['jpmto'],

    async execute(ctx) {
        const { Dinz, m, args, text, mime, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const targetJid = args[0] ? (args[0].endsWith('@g.us') ? args[0] : args[0] + '@g.us') : '';
        if (!targetJid) return Reply("❌ JID grup tidak valid.");

        let groupSubject = targetJid;
        try {
            const meta = await Dinz.groupMetadata(targetJid);
            groupSubject = meta.subject || targetJid;
        } catch (e) {}

        const pending = global._jpmPilihBroadcast?.[m.sender];
        const msgText = pending?.text || (args.slice(1).join(' ').trim());
        const mediaBuf = pending?.mediaBuf;
        const mediaMime = pending?.mime || mime;

        if (!msgText && !mediaBuf) {
            return Reply(`\`⌜ JPM To ⌟\`\n> ◦ Gunakan .jpmpilih dulu atau kirim pesan/media langsung:\n> ◦ Format: .jpmto <jid_grup> <pesan>`);
        }

        try {
            Reply(global.mess.wait);
            if (mediaBuf) {
                if (/image/.test(mediaMime)) {
                    await Dinz.sendMessage(targetJid, { image: mediaBuf, caption: msgText });
                } else if (/video/.test(mediaMime)) {
                    await Dinz.sendMessage(targetJid, { video: mediaBuf, caption: msgText, mimetype: mediaMime });
                }
            } else {
                await Dinz.sendMessage(targetJid, { text: msgText });
            }
            delete global._jpmPilihBroadcast?.[m.sender];
            Reply(`\`⌜ JPM Berhasil ⌟\`\n> ◦ Terkirim ke : *${groupSubject}*\n> ◦ Pesan : *${msgText || '[Media]'}*`);
        } catch (e) {
            Reply(`❌ Gagal kirim JPM ke ${groupSubject}: ${e.message}`);
        }
        return true;
    }
};
