module.exports = {
    name: 'autojpmtag',
    category: 'broadcast',
    commands: ['autojpmtag'],

    async execute(ctx) {
        const { Dinz, args, text, mime, qmsg, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const isMedia = /image|video/.test(mime);
        const teks = text || '';

        if (!teks && !isMedia) return Reply(example("pesan auto broadcast tag"));

        if (global._autoJpmTagInterval) {
            clearInterval(global._autoJpmTagInterval);
            global._autoJpmTagInterval = null;
        }

        let mediaBuf = null;
        let mediaMime = mime;
        if (isMedia && qmsg.download) {
            mediaBuf = await qmsg.download();
        }

        const delayAutoTag = global.db.settings.delayJpmTag || 3000;
        const intervalTimeTag = parseInt(args[0]) || 60000;

        Reply(`\`⌜ Auto JPM Tag Aktif ⌟\`\n> ◦ Interval : *setiap ${intervalTimeTag/1000}s*\n> ◦ Delay : *${delayAutoTag}ms*`);

        global._autoJpmTagInterval = setInterval(async () => {
            try {
                const allGrup = await Dinz.groupFetchAllParticipating();
                const grupEntries = Object.entries(allGrup);
                for (let [id, meta] of grupEntries) {
                    if (global.db.groups[id]?.blacklistjpm === true) continue;
                    try {
                        const members = (meta.participants || []).map(v => v.id);
                        const tag = members.map(v => `@${v.split('@')[0]}`).join(' ');
                        const pesanTag = `${teks}\n${tag}`;
                        if (mediaBuf) {
                            if (/image/.test(mediaMime)) {
                                await Dinz.sendMessage(id, { image: mediaBuf, caption: pesanTag, mentions: members });
                            } else if (/video/.test(mediaMime)) {
                                await Dinz.sendMessage(id, { video: mediaBuf, caption: pesanTag, mentions: members, mimetype: mediaMime });
                            }
                        } else {
                            await Dinz.sendMessage(id, { text: pesanTag, mentions: members });
                        }
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, delayAutoTag));
                }
            } catch (e) { console.error('AutoJPMTag error:', e.message); }
        }, intervalTimeTag);
        return true;
    }
};
