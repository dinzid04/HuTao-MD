const { formatCard } = require('./_helper');

module.exports = {
    name: 'balasconfess',
    category: 'fun',
    commands: ['balasconfess'],

    async execute(ctx) {
        const { Dinz, text, body, Reply, botCtx, usedPrefix } = ctx;

        const parts = text.split('|').map((s) => s.trim());
        if (parts.length < 2) return Reply(`⚠️ Format: \`${usedPrefix}balasconfess <ID> | <pesan balasan>\``);
        const [id, replyMsg] = parts;
        const confDb = botCtx.getSection('confess', Dinz) || {};
        const rec = confDb[id.toUpperCase()];
        if (!rec) return Reply('❌ ID Confess tidak ditemukan.');
        await Dinz.sendMessage(rec.from, {
            text: formatCard({
                icon: '💌',
                title: `BALASAN CONFESS (${id.toUpperCase()})`,
                body: replyMsg
            })
        });
        return Reply('✅ Balasan confess kamu berhasil dikirim!');
    }
};
