const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'setrulesgrup',
    category: 'group',
    commands: ['setrulesgrup', 'setrulesgc'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const rules = text.trim() || m.quoted?.body?.trim();
        if (!rules) return Reply(`⚠️ Masukkan teks aturan grup. Contoh: \`${usedPrefix}setrulesgrup 1. Sopan\``);
        getGroupObj(m.chat).rulesText = rules;
        return Reply('✅ Aturan grup berhasil disimpan!');
    }
};
