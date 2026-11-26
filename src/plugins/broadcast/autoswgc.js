module.exports = {
    name: 'autoswgc',
    category: 'broadcast',
    commands: ['autoswgc'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const qAutoSwgc = m.quoted ? m.quoted : m;
        const mimeAutoSwgc = (qAutoSwgc.msg || qAutoSwgc).mimetype || '';
        const captionAutoSwgc = text || '';

        if (!mimeAutoSwgc && !captionAutoSwgc) return Reply(example("teks atau reply media"));

        if (global._autoSwgcInterval) {
            clearInterval(global._autoSwgcInterval);
            global._autoSwgcInterval = null;
        }

        let swgcBuf = null;
        if (/image|video|audio/.test(mimeAutoSwgc) && qAutoSwgc.download) {
            swgcBuf = await qAutoSwgc.download();
        }

        const delaySwgcAuto = global.db.settings.delayAutoSwgc || 60000;
        const jidSwgcAuto = m.chat;

        Reply(`\`⌜ Auto SWGC Aktif ⌟\`\n> ◦ Interval : *setiap ${delaySwgcAuto/1000}s*`);

        global._autoSwgcInterval = setInterval(async () => {
            try {
                if (swgcBuf) {
                    if (/image/.test(mimeAutoSwgc)) {
                        await Dinz.sendMessage(jidSwgcAuto, { groupStatusMessage: { image: swgcBuf, caption: captionAutoSwgc } });
                    } else if (/video/.test(mimeAutoSwgc)) {
                        await Dinz.sendMessage(jidSwgcAuto, { groupStatusMessage: { video: swgcBuf, caption: captionAutoSwgc } });
                    } else if (/audio/.test(mimeAutoSwgc)) {
                        await Dinz.sendMessage(jidSwgcAuto, { groupStatusMessage: { audio: swgcBuf } });
                    }
                } else if (captionAutoSwgc) {
                    await Dinz.sendMessage(jidSwgcAuto, { groupStatusMessage: { text: captionAutoSwgc } });
                }
            } catch (e) { console.error('AutoSWGC error:', e.message); }
        }, delaySwgcAuto);
        return true;
    }
};
