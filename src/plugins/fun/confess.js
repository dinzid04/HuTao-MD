const { formatCard } = require('./_helper');

module.exports = {
    name: 'confess',
    category: 'fun',
    commands: ['confess'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix } = ctx;

        const parts = text.split('|').map((s) => s.trim());
        if (parts.length < 2) {
            return Reply(formatCard({
                icon: '💌',
                title: 'CONFESS ANONIM',
                body: `Kirim pesan rahasia ke seseorang lewat bot!\n\nFormat:\n\`${usedPrefix}confess 628xxx | Pesan rahasia | Nama Samaran (opsional)\``
            }));
        }
        let num = parts[0].replace(/[^0-9]/g, '');
        if (num.startsWith('08')) num = '62' + num.slice(1);
        if (num.length < 9) return Reply('❌ Nomor tujuan tidak valid.');
        const message = parts[1];
        const alias = parts[2] || 'Pengagum Rahasia';
        const targetJid = `${num}@s.whatsapp.net`;

        const confDb = botCtx.getSection('confess', Dinz) || {};
        const id = `CF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        confDb[id] = { from: m.sender, to: targetJid, alias, ts: Date.now() };
        botCtx.setSection('confess', confDb, Dinz);

        try {
            await Dinz.sendMessage(targetJid, {
                text: formatCard({
                    icon: '💌',
                    title: 'PESAN CONFESS MASUK',
                    rows: [
                        { label: 'ID', value: `\`${id}\`` },
                        { label: 'Dari', value: alias }
                    ],
                    body: message,
                    footer: `Balas dengan: ${usedPrefix}balasconfess ${id} | <balasan kamu>`
                })
            });
            return Reply(`✅ Pesan confess (\`${id}\`) berhasil dikirim ke *${num}* secara anonim!`);
        } catch (e) {
            return Reply(`❌ Gagal mengirim confess: ${e.message}`);
        }
        return true;
    }
};
