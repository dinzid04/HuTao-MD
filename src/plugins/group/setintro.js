const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'setintro',
    category: 'group',
    commands: ['setintro'],

    async execute(ctx) {
        const { m, text, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const intro = text.trim() || m.quoted?.body?.trim();
        if (!intro) return Reply(`⚠️ Masukkan format intro baru.`);
        getGroupObj(m.chat).introText = intro;
        return Reply('✅ Format intro grup berhasil disimpan!');
    }
};
