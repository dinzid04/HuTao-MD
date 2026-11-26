module.exports = {
    name: 'autojpm',
    category: 'broadcast',
    commands: ['autojpm'],

    async execute(ctx) {
        const { Dinz, args, text, mime, qmsg, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const isMedia = /image|video/.test(mime);
        const teks = text || '';

        if (!teks && !isMedia) return Reply(example("pesan auto broadcast"));

        if (global._autoJpmInterval) {
            clearInterval(global._autoJpmInterval);
            global._autoJpmInterval = null;
        }

        let mediaBuf = null;
        let mediaMime = mime;
        if (isMedia && qmsg.download) {
            mediaBuf = await qmsg.download();
        }

        const delayAuto = global.db.settings.delayJpm || 3000;
        const intervalTime = parseInt(args[0]) || 60000;

        Reply(`\`⌜ Auto JPM Aktif ⌟\`\n> ◦ Interval : *setiap ${intervalTime/1000}s*\n> ◦ Delay antar grup : *${delayAuto}ms*\n> ◦ Pesan : *${teks || '[Media]'}*`);

        global._autoJpmInterval = setInterval(async () => {
            try {
                const allGrup = await Dinz.groupFetchAllParticipating();
                const grupIds = Object.keys(allGrup);
                for (let i of grupIds) {
                    if (global.db.groups[i]?.blacklistjpm === true) continue;
                    try {
                        if (mediaBuf) {
                            if (/image/.test(mediaMime)) {
                                await Dinz.sendMessage(i, { image: mediaBuf, caption: teks });
                            } else if (/video/.test(mediaMime)) {
                                await Dinz.sendMessage(i, { video: mediaBuf, caption: teks, mimetype: mediaMime });
                            }
                        } else {
                            await Dinz.sendMessage(i, { text: teks });
                        }
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, delayAuto));
                }
            } catch (e) { console.error('AutoJPM error:', e.message); }
        }, intervalTime);
        return true;
    }
};
