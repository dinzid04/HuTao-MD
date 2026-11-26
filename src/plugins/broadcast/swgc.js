module.exports = {
    name: 'swgc',
    category: 'broadcast',
    commands: ['swgc'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const qSwgc = m.quoted ? m.quoted : m;
        const mimeSwgc = (qSwgc.msg || qSwgc).mimetype || '';
        const captionSwgc = text || '';
        const jidSwgc = m.chat;

        if (!mimeSwgc && !captionSwgc) return Reply(example("teks atau reply media"));

        try {
            Reply(global.mess.wait);
            if (/image/.test(mimeSwgc)) {
                const buf = await qSwgc.download();
                await Dinz.sendMessage(jidSwgc, { groupStatusMessage: { image: buf, caption: captionSwgc } });
                Reply(global.mess.done);
            } else if (/video/.test(mimeSwgc)) {
                const buf = await qSwgc.download();
                await Dinz.sendMessage(jidSwgc, { groupStatusMessage: { video: buf, caption: captionSwgc } });
                Reply(global.mess.done);
            } else if (/audio/.test(mimeSwgc)) {
                const buf = await qSwgc.download();
                await Dinz.sendMessage(jidSwgc, { groupStatusMessage: { audio: buf } });
                Reply(global.mess.done);
            } else if (captionSwgc) {
                await Dinz.sendMessage(jidSwgc, { groupStatusMessage: { text: captionSwgc } });
                Reply(global.mess.done);
            } else {
                Reply("❌ Kirim teks atau reply media untuk SWGC.");
            }
        } catch (e) {
            console.error("swgc error:", e);
            Reply(global.mess.error);
        }
        return true;
    }
};
