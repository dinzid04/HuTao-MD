const { formatCard, cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'cekpacar',
    category: 'fun',
    commands: ['cekpacar'],

    async execute(ctx) {
        const { Dinz, m, Reply, moment, botCtx } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
        const rec = couples[target];
        if (!rec?.partner) {
            return Reply(`💔 @${cleanNum(target)} saat ini masih *Jomblo*!`, [target]);
        }
        const days = Math.max(0, Math.floor((Date.now() - (rec.since || Date.now())) / 86400000));
        return Reply(formatCard({
            icon: '💑',
            title: 'STATUS PASANGAN',
            rows: [
                { label: 'Pasangan', value: `@${cleanNum(target)} ❤️ @${cleanNum(rec.partner)}` },
                { label: 'Jadian Sejak', value: moment(rec.since).tz('Asia/Jakarta').format('DD MMM YYYY') },
                { label: 'Durasi', value: `${days} hari` }
            ]
        }), [target, rec.partner]);
    }
};
