const { formatCard, cleanNum, getCouplesState } = require('./_helper');

module.exports = {
    name: 'terima',
    category: 'fun',
    commands: ['terima'],

    async execute(ctx) {
        const { Dinz, m, body, Reply, botCtx } = ctx;
        const { couples, saveCouples } = getCouplesState(botCtx, Dinz);

        const target = m.mentionedJid?.[0] || m.quoted?.sender
            || Object.keys(couples).find((k) => couples[k]?.pending === m.sender);
        if (!target || couples[target]?.pending !== m.sender) {
            return Reply('❌ Tidak ada yang sedang menembakmu saat ini.');
        }
        const now = Date.now();
        couples[target] = { partner: m.sender, pending: null, since: now };
        couples[m.sender] = { partner: target, pending: null, since: now };
        saveCouples();
        return Reply(formatCard({
            icon: '💑',
            title: 'RESMI JADIAN!',
            body: `🎉 Selamat! @${cleanNum(m.sender)} menerima cinta @${cleanNum(target)}!\nSemoga langgeng selalu! ❤️`
        }), [m.sender, target]);
    }
};
