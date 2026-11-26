const { cleanNum } = require('./_helper');

module.exports = {
    name: 'siapa',
    category: 'fun',
    commands: ['siapa'],

    async execute(ctx) {
        const { m, text, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const parts = m.metadata?.participants || [];
        if (!parts.length) return Reply('❌ Gagal membaca daftar member.');
        const pick = parts[Math.floor(Math.random() * parts.length)];
        const jid = pick.jid || pick.id;
        return Reply(`🎯 *${text.trim() || 'Yang terpilih'}:* @${cleanNum(jid)}!`, [jid]);
    }
};
